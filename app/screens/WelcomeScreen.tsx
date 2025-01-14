import { observer } from "mobx-react-lite"
import { FC } from "react"
import { ImageStyle, Platform, ScrollView, TextStyle, ViewStyle } from "react-native"
import { Text, Screen } from "@/components"
import { isRTL } from "../i18n"
import { AppStackScreenProps } from "../navigators"
import { $styles, type ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"


interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = observer(function WelcomeScreen() {
  const { themed } = useAppTheme()


  return (
    <Screen contentContainerStyle={$styles.flex1}>
      <ScrollView contentContainerStyle={themed($topContainer)}>
        <Text
          testID="welcome-heading"
          style={themed($welcomeHeading)}
          tx="welcomeScreen:readyForLaunch"
          preset="heading"
        />
        <Text tx="welcomeScreen:exciting" preset="subheading" />
        
      </ScrollView>
    </Screen>
  )
})

const $topContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexShrink: 1,
  flexGrow: 1,
  flexBasis: "65%",
  justifyContent: "center",
  alignItems: "center",
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
  width: "100%"
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
