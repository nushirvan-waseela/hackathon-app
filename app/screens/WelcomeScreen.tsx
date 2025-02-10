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
} from "react-native"
import { Text, Screen } from "@/components"
import { AppStackScreenProps } from "../navigators"
import { loadString, saveString } from "@/utils/storage"
import { useNavigation } from "@react-navigation/native"
import logo from "../../assets/images/logo.png"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = observer(function WelcomeScreen() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const [deviceId, setDeviceId] = useState<string>(loadString("deviceId") || "")
  const [isFocused, setIsFocused] = useState(false)
  const textInputRef = useRef<TextInput>(null)
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handleSubmit = () => {
    if (deviceId.trim()) {
      // TODO: Add validation for device id and show error if not valid

      // TODO: Add api call to check if device id is valid

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
  }

  useEffect(() => {
    if (!loadString("deviceId")) {
      textInputRef.current?.focus()
    }
  }, [])

  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.welcomeText}>Welcome to Dukaan TV</Text>
      <Text style={styles.instructionText}>Please enter your device ID to continue</Text>
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={styles.input}
          placeholder="Enter Device ID"
          placeholderTextColor="#A0A0A0"
          value={deviceId}
          onChangeText={setDeviceId}
        />
        <Pressable onPress={handleSubmit} style={styles.button}>
          <Animated.Text style={[styles.buttonText, { transform: [{ scale: scaleAnim }] }]}>
            Enter
          </Animated.Text>
        </Pressable>
      </View>
    </View>
  )
})

const styles = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e79167",
    width: "100%",
    height: "100%",
  } as ViewStyle,
  logo: {
    width: 200,
    height: 100,
    resizeMode: "contain",
    marginBottom: 20,
  } as ImageStyle,
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  } as TextStyle,
  instructionText: {
    fontSize: 16,
    color: "#000",
    marginBottom: 20,
  } as TextStyle,
  inputContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "80%",
  } as ViewStyle,
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 10,
    textAlign: "center",
    color: "#000",
  } as TextStyle,
  button: {
    backgroundColor: "#ff6600",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  } as TextStyle,
}
