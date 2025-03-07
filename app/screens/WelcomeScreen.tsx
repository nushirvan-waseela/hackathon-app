import { observer } from "mobx-react-lite"
import { FC, useEffect, useRef, useState } from "react"
import {
  TextStyle,
  View,
  ViewStyle,
  TextInput,
  Pressable,
  Animated,
  Platform,
  Image,
  ImageStyle,
  ActivityIndicator,
} from "react-native"
import { Text, Screen } from "@/components"
import { AppStackScreenProps } from "../navigators"
import { loadString, saveString } from "@/utils/storage"
import { useNavigation } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { fetchSheetData } from "@/services/api/readSheet"

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = observer(function WelcomeScreen() {
  const navigation = useNavigation()

  const [deviceId, setDeviceId] = useState<string>(loadString("deviceId") || "")
  const textInputRef = useRef<TextInput>(null)
  const scaleAnim = useRef(new Animated.Value(1)).current
  const [isFocused, setIsFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Clear error when deviceId changes
  useEffect(() => {
    if (error) setError(null)
  }, [deviceId])

  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current?.focus()
    }
  }, [])

  const handleIDValidation = async () => {
    if (!deviceId || deviceId.trim() === "") {
      setError("Please enter a Device ID")
      throw new Error("Device ID not found")
    }

    setIsLoading(true)

    try {
      // First try to load from cache
      const cachedData = await AsyncStorage.getItem("CMSData")
      let isValidId = false

      if (cachedData) {
        const parsedData = JSON.parse(cachedData)
        const sheet1 = parsedData.sheet1

        // Compare as strings to avoid type issues
        isValidId = sheet1.some((item: any) => String(item.tvId) === String(deviceId))

        if (isValidId) {
          return true
        }
      }

      // If not found in cache or cache doesn't exist, fetch fresh data
      const data = await fetchSheetData(deviceId)

      if (!data || !data.sheet1) {
        throw new Error("Failed to fetch data")
      }

      if (data.sheet1.length === 0) {
        throw new Error("No content available for this Device ID")
      }

      // Check if the device ID exists in the fetched data
      isValidId = data.sheet1.some((item: any) => String(item.tvId) === String(deviceId))

      if (!isValidId) {
        throw new Error("Invalid Device ID")
      }
      // clear the deviceId from the storage
      await AsyncStorage.removeItem("deviceId")
      await AsyncStorage.removeItem("CMSData")

      return true
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      if (deviceId.trim()) {
        await handleIDValidation()

        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start(() => {
          saveString("deviceId", deviceId)
          navigation.navigate("Videos" as never)
        })
      }
    } catch (error) {
      setError(error?.message as string)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/images/logo.png")} style={styles.logo} />
      <Text style={styles.welcomeText}>Welcome to KDukaan TV</Text>
      <Text style={styles.instructionText}>Please enter your device ID to continue</Text>

      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={[styles.input, isFocused && styles.inputFocused]}
          placeholder="Enter Device ID"
          autoFocus={true}
          onFocus={() => setIsFocused(true)}
          placeholderTextColor="#A0A0A0"
          value={deviceId}
          onChangeText={setDeviceId}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          keyboardType="web-search"
        />

        {isLoading && <ActivityIndicator size="small" color="#fff" />}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
})

const styles = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4E266E",
    width: "100%",
    height: "100%",
  } as ViewStyle,
  logo: {
    width: 200,
    height: 100,
    resizeMode: "contain",
    marginBottom: 10,
  } as ImageStyle,
  welcomeText: {
    padding: 10,
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#fff",
    textAlign: "center",
  } as TextStyle,
  instructionText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  } as TextStyle,
  inputContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "80%",
  } as ViewStyle,
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    alignItems: "center",
    borderColor: "#fff",
    borderRadius: 5,
    marginBottom: 15,
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
  } as TextStyle,
  inputFocused: {
    borderColor: "#e79167",
    borderWidth: 3,
    boxShadow: "0 0 10px 0 rgba(231, 145, 103, 0.5)",
  } as TextStyle,
  button: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    borderColor: "#e79167",
    borderWidth: 1,
    minWidth: 120,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  } as TextStyle,
  errorText: {
    color: "#ff4444",
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 5,
  } as TextStyle,
}
