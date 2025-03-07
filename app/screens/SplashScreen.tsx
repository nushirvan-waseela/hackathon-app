import React, { useEffect, useRef } from "react"
import { View, Animated, Image, ViewStyle, ImageStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { observer } from "mobx-react-lite"
import { FC } from "react"
import logo from "assets/images/logo.png"

interface SplashScreenProps extends AppStackScreenProps<"SplashScreen"> {}

export const SplashScreen: FC<SplashScreenProps> = observer(function SplashScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  // Using useRef for better animation performance
  const scaleValue = useRef(new Animated.Value(0.3)).current
  const opacityValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      // Fade in
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Scale up
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        navigation.navigate("Welcome" as never)
      }, 500) // Hold for a brief moment before switching screens
    })
  }, [])

  return (
    <View style={[$container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          $logoContainer,
          {
            opacity: opacityValue,
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <Image source={logo} style={$logo} />
      </Animated.View>
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: "#e79167", // Matched with Welcome Screen
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  height: "100%",
}

const $logoContainer: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
}

const $logo: ImageStyle = {
  width: 250, // Larger for better TV visibility
  height: 120,
  resizeMode: "contain",
}
