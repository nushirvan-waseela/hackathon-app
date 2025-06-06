import React, { FC, useEffect, useState, useRef, useCallback, useMemo } from "react"
import { observer } from "mobx-react-lite"
import {
  ViewStyle,
  Dimensions,
  ActivityIndicator,
  ImageStyle,
  TextStyle,
  Animated,
  Platform,
  View,
  StatusBar,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
import RNFS from "react-native-fs"
import Video from "react-native-video"
import { Image } from "react-native"
import { fetchSheetData } from "@/services/api/readSheet"
import { logData } from "@/services/api/writeSheet"
import Toast from "react-native-toast-message"
import { loadString } from "@/utils/storage"
import { downloadFiles, getFilePath } from "@/utils/downloadFile"

interface MediaItem {
  contentId: number
  id: number
  title: string
  type: "video" | "image"
  tvId: number
  link: string
  filePath?: string
}

interface LogType {
  tv_id: string
  content_id: string
  timestamp_start: string
  timestamp_end: string
  date: string
}

interface VideosScreenProps extends AppStackScreenProps<"Videos"> {}

const MEDIA_DISPLAY_DURATION = 3000
const REFRESH_INTERVAL = 60000
const TRANSITION_DURATION = 300

export const VideosScreen: FC<VideosScreenProps> = observer(function VideosScreen() {
  const [videos, setVideos] = useState<MediaItem[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const videoPlayer = useRef(null)
  const isAndroidTV = Platform.OS === "android" && Platform.isTV

  // Use the entire screen size for media dimensions
  const screenWidth = Dimensions.get("window").width
  const screenHeight = Dimensions.get("window").height

  const DEVICE_ID = loadString("deviceId")
  const fadeAnim = useRef(new Animated.Value(1)).current
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Cache for downloaded files
  const downloadedFilesRef = useRef<Set<string>>(new Set())

  // Keep track of timers to clean them up properly
  const timersRef = useRef<NodeJS.Timeout[]>([])

  // Hide status bar for fullscreen experience
  useEffect(() => {
    StatusBar.setHidden(true, "none")
    return () => {
      StatusBar.setHidden(false, "none")
    }
  }, [])

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }, [])

  const addTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay)
    timersRef.current.push(timer)
    return timer
  }, [])

  const fetchData = useCallback(async () => {
    try {
      if (!DEVICE_ID) {
        setError("Device ID not found")
        return
      }

      // First try to load from cache
      const cachedData = await AsyncStorage.getItem("CMSData")

      if (cachedData) {
        const parsedData = JSON.parse(cachedData)
        setVideos(parsedData.sheet1)
        setLoading(false)

        // Download in background
        downloadFiles(parsedData.sheet1)
      }

      // Then fetch fresh data
      const data = await fetchSheetData(DEVICE_ID)
      if (data && data.sheet1 && data.sheet1.length === 0) {
        setError("No media content available")
        return
      }

      if (data && data.sheet1 && data.sheet1.length > 0) {
        await downloadFiles(data.sheet1)
        setVideos(data.sheet1)
        setLoading(false)
        await AsyncStorage.setItem("CMSData", JSON.stringify(data))
      } else if (!cachedData) {
        // Only show error if we don't have cached data
        setError("No media content available")
      }
    } catch (error) {
      console.error("Fetch error:", error)
      // Only show error if we don't have videos loaded
      if (videos?.length === 0) {
        setError("Failed to fetch data")
      }
    }
  }, [DEVICE_ID, downloadFiles, videos?.length])

  useEffect(() => {
    fetchData()
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL)

    return () => {
      clearInterval(intervalId)
      clearAllTimers()
    }
  }, [fetchData, clearAllTimers])

  const handleEnd = useCallback(() => {
    if (isTransitioning || videos.length === 0) return

    setIsTransitioning(true)
    setIsPaused(true) // Pause video during transition

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: TRANSITION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length)

      // Short delay before fading in the next item
      addTimer(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: TRANSITION_DURATION,
          useNativeDriver: true,
        }).start(() => {
          setIsTransitioning(false)
          setIsPaused(false) // Resume video after transition
        })
      }, 100)
    })
  }, [videos.length, fadeAnim, isTransitioning, addTimer])

  const updateLogData = useCallback(
    (media: MediaItem) => {
      if (!DEVICE_ID) return

      const now = new Date()
      const optionsTime = {
        timeZone: "Asia/Karachi",
        hour: "2-digit" as const,
        minute: "2-digit" as const,
        second: "2-digit" as const,
        hour12: true,
      }
      const optionsDate = {
        timeZone: "Asia/Karachi",
        year: "numeric" as const,
        month: "2-digit" as const,
        day: "2-digit" as const,
      }

      const timestampEnd = new Date(now)
      timestampEnd.setSeconds(timestampEnd.getSeconds() + 3)

      const timeStr = new Intl.DateTimeFormat("en-GB", optionsTime).format(now)
      const dateStr = new Intl.DateTimeFormat("en-GB", optionsDate).format(now)

      const newLog: LogType = {
        tv_id: DEVICE_ID || "",
        content_id: media.contentId.toString(),
        timestamp_start: timeStr,
        timestamp_end: new Date(now.getTime() + 3000).toLocaleTimeString("en-GB", {
          timeZone: "Asia/Karachi",
          hour12: true,
        }),
        date: dateStr,
      }

      // Use our timer management
      addTimer(() => logData(newLog), MEDIA_DISPLAY_DURATION)
    },
    [DEVICE_ID, addTimer],
  )

  useEffect(() => {
    if (videos.length > 0 && !isTransitioning) {
      const currentMedia = videos[currentIndex]

      if (currentMedia?.type === "image") {
        updateLogData(currentMedia)

        // Use our timer management
        addTimer(handleEnd, MEDIA_DISPLAY_DURATION)
      }
    }
  }, [currentIndex, videos, updateLogData, handleEnd, isTransitioning, addTimer])

  const renderMedia = useCallback(
    (media: MediaItem) => {
      const filePath = getFilePath(media)
      console.log("Attempting to load media:", filePath)

      if (media.type === "video") {
        return (
          <Animated.View
            style={{ opacity: fadeAnim, flex: 1, width: screenWidth, height: screenHeight }}
          >
            <Video
              source={{
                uri: `file://${filePath}`,
                type: "mp4",
                headers: {
                  Range: "bytes=0-", // Support range requests
                },
              }}
              ref={videoPlayer}
              onEnd={handleEnd}
              progressUpdateInterval={1000} // Less frequent updates to reduce load
              onProgress={(data) => {
                // Only log occasionally to reduce console spam
                if (Math.floor(data.currentTime) % 5 === 0) {
                  console.log("Video progress:", Math.floor(data.currentTime))
                }
              }}
              onLoad={(data) => {
                console.log("Video loaded successfully:", filePath, data)
                updateLogData(media)
              }}
              onReadyForDisplay={() => {
                console.log("Video ready for display:", filePath)
              }}
              resizeMode={isAndroidTV ? "cover" : "contain"} // Use 'cover' for TV to ensure fullscreen
              style={$fullscreenMedia}
              repeat={videos.length === 1}
              paused={isPaused}
              controls={false} // Hide controls as requested
              fullscreen={isAndroidTV} // Force fullscreen mode on Android TV
              ignoreSilentSwitch="ignore" // Play even in silent mode
              playInBackground={false}
              maxBitRate={2000000} // 2 Mbps - reasonable for mobile
              bufferConfig={{
                minBufferMs: 15000,
                maxBufferMs: 50000,
                bufferForPlaybackMs: 2500,
                bufferForPlaybackAfterRebufferMs: 5000,
              }}
              onError={(error) => {
                console.error("Video error for file:", filePath, error)

                // Show a toast error message
                Toast.show({
                  type: "error",
                  text1: "Video Error",
                  text2: "There was a problem playing this video",
                  position: "bottom",
                })

                // Skip to next content
                handleEnd()
              }}
              onBuffer={(data) => {
                console.log("Video buffering:", data.isBuffering)
              }}
            />
          </Animated.View>
        )
      }

      return (
        <Animated.View
          style={{ opacity: fadeAnim, flex: 1, width: screenWidth, height: screenHeight }}
        >
          <Image
            source={{ uri: `file://${filePath}` }}
            style={$fullscreenMedia as ImageStyle}
            resizeMode={isAndroidTV ? "cover" : "contain"} // Use 'cover' for TV to ensure fullscreen
            onLoad={() => {
              console.log("Image loaded successfully:", filePath)
              updateLogData(media)
            }}
            onError={(error) => {
              console.error("Failed to load image:", filePath, error)
              handleEnd()
            }}
          />
        </Animated.View>
      )
    },
    [
      handleEnd,
      fadeAnim,
      updateLogData,
      isPaused,
      videos.length,
      screenWidth,
      screenHeight,
      isAndroidTV,
    ],
  )

  const currentMedia = useMemo(
    () => (videos?.length > 0 && currentIndex < videos?.length ? videos[currentIndex] : null),
    [videos, currentIndex],
  )

  if (loading && !currentMedia) {
    return (
      <Screen style={$root} preset="fixed">
        <ActivityIndicator size="large" color="#ffffff" />
      </Screen>
    )
  }

  if (error && videos?.length === 0) {
    return (
      <Screen style={$root} preset="fixed">
        <Text text={error} style={$errorText} />
      </Screen>
    )
  }

  return (
    <>
      <StatusBar hidden />
      <Screen style={$root} preset="fixed">
        {currentMedia ? (
          <View style={$fullscreenMediaContainer}>
            {renderMedia(currentMedia)}
            {/* Only show counter on non-TV devices */}
            {!isAndroidTV && (
              <Text text={`${currentIndex + 1}/${videos?.length}`} style={$counter} />
            )}
          </View>
        ) : (
          <ActivityIndicator size="large" color="#ffffff" />
        )}
      </Screen>
      <Toast />
    </>
  )
})

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

const $root: ViewStyle = {
  flex: 1,
  width: screenWidth,
  height: screenHeight,
  backgroundColor: "#000",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  margin: 0,
}

const $fullscreenMediaContainer: ViewStyle = {
  flex: 1,
  width: screenWidth,
  height: screenHeight,
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
  margin: 0,
  overflow: "hidden",
}

const $fullscreenMedia: ViewStyle = {
  width: screenWidth,
  height: screenHeight,
  backgroundColor: "#000",
  padding: 0,
  margin: 0,
}

const $counter: TextStyle = {
  position: "absolute",
  top: 20,
  right: 20,
  backgroundColor: "rgba(0,0,0,0.7)",
  padding: 8,
  borderRadius: 20,
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "500",
}

const $errorText: TextStyle = {
  color: "#ff4444",
  fontSize: 16,
  textAlign: "center",
  padding: 20,
  backgroundColor: "rgba(255,68,68,0.1)",
  borderRadius: 8,
  margin: 20,
}
