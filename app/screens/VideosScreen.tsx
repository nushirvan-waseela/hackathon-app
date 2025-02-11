import { FC, useEffect, useState, useRef, useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, Dimensions, ActivityIndicator, View } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
import { DocumentDirectoryPath } from "react-native-fs"
import Video from "react-native-video"
import { logData, LogType } from "@/services/api/writeSheet"
import Toast from "react-native-toast-message"
import { fetchSheetData } from "@/services/api/readSheet"
import { fetchDriveData } from "@/services/api/readDrive"
import { loadString } from "@/utils/storage"
import { downloadFiles } from "@/utils/downloadFile"

interface VideosScreenProps extends AppStackScreenProps<"Videos"> {}

// Updated interface to match the actual data structure
interface MediaItem {
  time: string
  email: string
  tvScreen: string
  title: string
  url: string
  type: "video" | "image"
}

// Constants
const STORAGE_KEY = "CMSData"
const REFRESH_INTERVAL = 100000
const TIMEZONE = "Asia/Karachi"

export const VideosScreen: FC<VideosScreenProps> = observer(function VideosScreen() {
  // State management
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [mediaSize, setMediaSize] = useState(() => ({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.9,
  }))

  // Refs
  const videoPlayer = useRef<any>(null)
  const unmountedRef = useRef(false)

  // Progress handler
  const handleProgress = useCallback((progress: Record<string, number>) => {
    setDownloadProgress((prev) => ({ ...prev, ...progress }))
  }, [])

  // Fetch and cache media data
  const fetchAndCacheData = useCallback(async () => {
    if (unmountedRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // Try to get cached data first
      const cachedData = await AsyncStorage.getItem(STORAGE_KEY)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        setMediaItems(parsed)
      }

      // Fetch fresh data from your API
      const key = loadString("deviceId")
      const data = await fetchSheetData(key as string) // Consider making ID configurable
      const validatedData = validateMediaData(data.sheet1)

      // Download media files
      await downloadFiles(handleProgress, validatedData)

      // Update state and cache
      if (!unmountedRef.current) {
        setMediaItems(validatedData)
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validatedData))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch or process media data",
      })
    } finally {
      if (!unmountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initialize and cleanup
  useEffect(() => {
    fetchAndCacheData()
    const interval = setInterval(fetchAndCacheData, REFRESH_INTERVAL)

    return () => {
      unmountedRef.current = true
      clearInterval(interval)
    }
  }, [fetchAndCacheData])

  // Media playback logging
  const logMediaView = useCallback(async (media: MediaItem, duration: number) => {
    const now = new Date()
    const endTime = new Date(now.getTime() + duration)

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })

    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    const logEntry: LogType = {
      tv_id: media.tvScreen.toString(),
      content_id: media.title.toString(),
      timestamp_start: formatter.format(now),
      timestamp_end: formatter.format(endTime),
      date: dateFormatter.format(now),
    }

    try {
      await logData(logEntry)
    } catch (err) {
      console.error("Failed to log media view:", err)
    }
  }, [])

  // Helper functions
  const validateMediaData = (data: any[]): MediaItem[] => {
    return data.filter((item) => {
      const isValid =
        typeof item.url === "string" &&
        typeof item.title === "string" &&
        typeof item.tvScreen === "string" &&
        (item.type.toLowerCase() === "video" || item.type.toLowerCase() === "image")
      if (!isValid) {
        console.warn("Invalid media item:", item, {
          urlValid: typeof item.url === "string",
          titleValid: typeof item.title === "string",
          tvScreenValid: typeof item.tvScreen === "string",
          typeValid: item.type.toLowerCase() === "video" || item.type.toLowerCase() === "image",
        })
      }
      return isValid
    })
  }

  const getFileExtension = (url: string): string => {
    const match = url.match(/\.([^.]+)(?:\?|$)/)
    return match ? match[1].toLowerCase() : "mp4"
  }

  const calculateMediaSize = useCallback(() => {
    const screenWidth = Dimensions.get("window").width
    const screenHeight = Dimensions.get("window").height

    return {
      width: screenWidth,
      height: screenHeight,
    }
  }, [])

  // Render functions
  const handleMediaEnd = useCallback(() => {
    if (mediaItems.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % mediaItems.length)
    }
  }, [mediaItems.length])

  const renderMedia = useCallback(
    (media: MediaItem) => {
      const extension = getFileExtension(media.url)
      const filePath = `${DocumentDirectoryPath}/${media.title}.${extension}`

      return (
        <Video
          source={{ uri: filePath }}
          ref={videoPlayer}
          onEnd={handleMediaEnd}
          onLoad={({ naturalSize, duration }) => {
            if (naturalSize.width && naturalSize.height) {
              setMediaSize(calculateMediaSize())
            }
            // Log video view when it starts
            logMediaView(media, duration * 1000)
          }}
          resizeMode="contain"
          style={[$mediaContainer, mediaSize]}
          repeat={mediaItems.length === 1} // Set repeat to true if there is only one video
        />
      )
    },
    [calculateMediaSize, handleMediaEnd, logMediaView, mediaItems.length],
  )

  if (error) {
    return (
      <Screen style={$root}>
        <Text style={$errorText}>{error}</Text>
      </Screen>
    )
  }

  return (
    <Screen style={$root}>
      {isLoading ? (
        <View style={$centerContent}>
          <ActivityIndicator size="large" />
          <Text style={$loadingText}>Loading media...</Text>
          {Object.entries(downloadProgress).map(([contentId, progress]) => (
            <Text key={contentId}>
              Downloading {contentId}: {Math.round(progress)}%
            </Text>
          ))}
        </View>
      ) : (
        mediaItems.length > 0 && renderMedia(mediaItems[currentIndex])
      )}
      <Toast />
    </Screen>
  )
})

const $centerContent: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingText: ViewStyle = {
  marginTop: 10,
}

const $errorText: ViewStyle = {
  backgroundColor: "red",
  alignContent: "center",
  margin: 20,
}

const $mediaContainer: ViewStyle = {
  flex: 1,
  position: "relative",
  width: "100%",
  height: "100%",
}
const $root: ViewStyle = {
  flex: 1,
  position: "relative",
  backgroundColor: "black", // Or any color you prefer
}
