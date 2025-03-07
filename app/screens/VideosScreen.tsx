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

interface MediaItem {
  contentId: string
  title: string
  type: "video" | "image"
  link: string
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
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number }>({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.7,
  })
  const DEVICE_ID = loadString("deviceId")
  const fadeAnim = useRef(new Animated.Value(1)).current
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Cache for downloaded files
  const downloadedFilesRef = useRef<Set<string>>(new Set())

  // Keep track of timers to clean them up properly
  const timersRef = useRef<NodeJS.Timeout[]>([])

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }, [])

  const addTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay)
    timersRef.current.push(timer)
    return timer
  }, [])

  const downloadFiles = useCallback(async (mediaItems: MediaItem[]) => {
    const downloadPromises = mediaItems.map(async (media) => {
      const filePath = `${RNFS.DocumentDirectoryPath}/${media.contentId}.${media.type === "video" ? "mp4" : "jpg"}`

      // Skip if already in our cache
      if (downloadedFilesRef.current.has(media.contentId)) {
        return
      }

      try {
        const fileExists = await RNFS.exists(filePath)
        if (!fileExists) {
          await RNFS.downloadFile({
            fromUrl: media.link,
            toFile: filePath,
          }).promise

          // Add to our cache
          downloadedFilesRef.current.add(media.contentId)
        } else {
          downloadedFilesRef.current.add(media.contentId)
        }
      } catch (error) {
        console.error(`Failed to download: ${media.title}`, error)
        Toast.show({
          type: "error",
          text1: "Download Failed",
          text2: `Failed to download: ${media.title}`,
        })
      }
    })

    await Promise.all(downloadPromises)
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

      const newLog = {
        tv_id: DEVICE_ID,
        content_id: media.contentId,
        timestamp_start: new Intl.DateTimeFormat("en-GB", optionsTime).format(now),
        timestamp_end: new Intl.DateTimeFormat("en-GB", optionsTime).format(timestampEnd),
        date: new Intl.DateTimeFormat("en-GB", optionsDate).format(now),
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

  const getMediaPath = useCallback((media: MediaItem) => {
    const extension = media.type === "video" ? "mp4" : "jpg"
    return `${RNFS.DocumentDirectoryPath}/${media.contentId}.${extension}`
  }, [])

  const renderMedia = useCallback(
    (media: MediaItem) => {
      const filePath = getMediaPath(media)

      if (media.type === "video") {
        return (
          <Animated.View style={[{ opacity: fadeAnim, flex: 1 }]}>
            <Video
              source={{ uri: `file://${filePath}` }}
              ref={videoPlayer}
              onEnd={handleEnd}
              onLoad={(data) => {
                const { width, height } = data.naturalSize || { width: 0, height: 0 }
                if (width && height) {
                  setMediaSize({ width, height })
                }
                updateLogData(media)
              }}
              resizeMode="contain"
              style={$media}
              repeat={false}
              paused={isPaused}
              onError={(error) => {
                console.error("Video error:", error)
                handleEnd() // Skip to next on error
              }}
              bufferConfig={{
                minBufferMs: 15000,
                maxBufferMs: 30000,
                bufferForPlaybackMs: 2500,
                bufferForPlaybackAfterRebufferMs: 5000,
              }}
            />
          </Animated.View>
        )
      }

      return (
        <Animated.View style={[{ opacity: fadeAnim, flex: 1 }]}>
          <Image
            source={{ uri: `file://${filePath}` }}
            style={$media as ImageStyle}
            resizeMode="contain"
            onLoad={(event) => {
              const { width, height } = event.nativeEvent.source || { width: 0, height: 0 }
              if (width && height) {
                setMediaSize({ width, height })
              }
            }}
            onError={() => {
              console.error("Failed to load image:", filePath)
              handleEnd() // Skip to next on error
            }}
          />
        </Animated.View>
      )
    },
    [handleEnd, fadeAnim, getMediaPath, updateLogData, isPaused],
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
      <Screen style={$root} preset="fixed">
        {currentMedia ? (
          <View style={$mediaContainer}>
            {renderMedia(currentMedia)}
            <Text text={`${currentIndex + 1}/${videos?.length}`} style={$counter} />
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
}

const $mediaContainer: ViewStyle = {
  flex: 1,
  width: screenWidth,
  height: screenHeight,
  justifyContent: "center",
  alignItems: "center",
}

const $media: ViewStyle = {
  width: screenWidth,
  height: screenHeight,
  backgroundColor: "#000",
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
