import { observer } from "mobx-react-lite"
import { FC, useEffect, useRef, useState } from "react"
import {
  ImageStyle,
  Platform,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
  TextInput,
} from "react-native"
import { Text, Screen, TextField } from "@/components"
import { isRTL } from "../i18n"
import { AppStackScreenProps } from "../navigators"
import { $styles, type ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { t } from "i18next"
import { loadString, saveString } from "@/utils/storage"
import { useNavigation } from "@react-navigation/native"

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = observer(function WelcomeScreen() {
  const { themed } = useAppTheme()
  const navigation = useNavigation()

  const id = loadString("deviceId")
  const [deviceId, setDeviceId] = useState<string>(id || "")

  const textFieldRef = useRef<TextInput>(null) // Create a ref for the TextField

  const handleSubmit = () => {
    if (deviceId.trim()) {
      saveString("deviceId", deviceId)
      navigation.navigate("Videos" as never)
    }
  }

  useEffect(() => {
    if (id) {
      // navigation.navigate("Videos" as never)
    } else {
      textFieldRef.current?.focus() // Focus the TextField when the screen is displayed
    }
  }, [id])

  return (
    <Screen contentContainerStyle={$styles.flex1}>
      <ScrollView contentContainerStyle={themed($topContainer)}>
        <Text
          testID="welcome-heading"
          style={themed($welcomeHeading)}
          tx="welcomeScreen:heading"
          preset="heading"
        />
        <Text tx="welcomeScreen:deviceIdField" preset="subheading" />
        <View style={themed($textFieldContainer)}>
          <TextField
            ref={textFieldRef} // Attach the ref to the TextField
            value={deviceId}
            onChangeText={setDeviceId}
            onSubmitEditing={handleSubmit} // Submit on Enter key press
            style={themed($textField)}
            placeholder={t("welcomeScreen:deviceIdPlaceholder")}
            autoFocus // Ensure the TextField can autofocus
            returnKeyType="done" // Specify the return key type for clarity
          />
        </View>
      </ScrollView>
    </Screen>
  )
})

const $topContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexShrink: 1,
  flexGrow: 1,
  flexBasis: "65%",
  justifyContent: "flex-start",
  alignItems: "center",
  paddingTop: 100,
  paddingHorizontal: Platform.isTV ? spacing.xxl : spacing.lg * 2,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexShrink: 1,
  flexGrow: 0,
  flexBasis: "35%",
  backgroundColor: colors.palette.neutral100,
  borderTopLeftRadius: Platform.isTV ? 48 : 24,
  borderTopRightRadius: Platform.isTV ? 48 : 24,
  paddingHorizontal: Platform.isTV ? spacing.xxl : spacing.lg * 2,
  justifyContent: "space-around",
  width: "100%",
})

const $welcomeLogo: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  height: Platform.isTV ? 352 : 176,
  width: Platform.isTV ? "60%" : "100%",
  marginBottom: spacing.xxl * 1.5,
})

const $welcomeFace: ImageStyle = {
  height: Platform.isTV ? 676 : 338,
  width: Platform.isTV ? 1076 : 538,
  position: "absolute",
  bottom: Platform.isTV ? -188 : -94,
  right: Platform.isTV ? -320 : -160,
  transform: [{ scaleX: isRTL ? -1 : 1 }],
}

const $welcomeHeading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $textField: ThemedStyle<TextStyle> = ({ colors }) => ({
  borderColor: colors.palette.neutral200,
  borderWidth: 1,
  borderRadius: 4,
  padding: 8,
})

const $textFieldContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral100,
  width: 600,
  display: "flex",
  flexDirection: "column",
})
