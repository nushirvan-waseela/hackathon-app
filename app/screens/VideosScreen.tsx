import { FC, useEffect, useState, useRef } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, Dimensions } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
import { fetchCMSData } from "@/services/api/cms"
import { loadString } from "@/utils/storage"
import RNFS from "react-native-fs" // File system library
import Video from "react-native-video" // Video playback component
import { Image } from "react-native" // Image component for pictures

interface VideosScreenProps extends AppStackScreenProps<"Videos"> {}
const getFileType = async (filePath: string) => {
  const fileData = await RNFS.readFile(filePath, "base64")
  const buffer = Buffer.from(fileData, "base64")
  const header = buffer.slice(0, 4).toString("hex")

  switch (header) {
    case "ffd8ffe0": // JPEG
    case "ffd8ffe1":
    case "ffd8ffe2":
      return "jpg"
    case "89504e47": // PNG
      return "png"
    case "52494646": // WebP
      return "webp"
    default:
      return "unknown"
  }
}

export const VideosScreen: FC<VideosScreenProps> = observer(function VideosScreen() {
  const [videos, setVideos] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0) // Index to track the currently playing video/image
  const videoPlayer = useRef(null) // Ref for the Video component
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number }>({
    width: Dimensions.get("window").width,
    height: 250,
  }) // State to store media dimensions
  const id = loadString("deviceId")

  useEffect(() => {
    const getData = async () => {
      try {
        console.log("id: ", id)
        const storedData = await AsyncStorage.getItem("CMSData")
        if (storedData) {
          const parsedData = JSON.parse(storedData)
          const data = await fetchCMSData(id || "")
          const updatedData = { sheet1: data.sheet1 }
          await downloadFiles(data.sheet1)
          setVideos(updatedData.sheet1)
          await AsyncStorage.setItem("CMSData", JSON.stringify(updatedData))
        } else {
          const data = await fetchCMSData(id || "")
          await downloadFiles(data.sheet1)
          setVideos(data.sheet1)
          await AsyncStorage.setItem("CMSData", JSON.stringify(data))
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }

    getData()
  }, [])

  useEffect(() => {
    if (videos.length > 0) {
      const currentMedia = videos[currentIndex]
      if (currentMedia.type === "image") {
        // Show image for 3 seconds, then move to next media
        const timer = setTimeout(handleEnd, 3000)
        return () => clearTimeout(timer) // Clear timeout on cleanup
      }
    }
  }, [currentIndex, videos])

  const downloadFiles = async (videos: any[]) => {
    for (const video of videos) {
      const filePath = `${RNFS.DocumentDirectoryPath}/${video.contentId}.jpg`
      const fileExists = await RNFS.exists(filePath)

      if (!fileExists) {
        try {
          await RNFS.downloadFile({
            fromUrl: video.link,
            toFile: filePath,
          }).promise
          console.log(`Download completed for item: ${video.title}`)
        } catch (error) {
          console.error(`Download failed for item: ${video.title}`, error)
        }
      } else {
        console.log(`File already exists for item: ${video.title}`)
      }
    }
  }

  const handleEnd = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length)
  }

  const renderMedia = (media: any) => {
    if (media.type === "video") {
      const filePath = `${RNFS.DocumentDirectoryPath}/${media.contentId}.jpg`
      return (
        <Video
          source={{ uri: filePath }}
          ref={videoPlayer}
          onEnd={handleEnd}
          onLoad={(data) => {
            const { width, height } = data.naturalSize
            if (width && height) {
              setMediaSize({ width, height })
            }
          }}
          resizeMode="contain"
          style={{ width: mediaSize.width, height: mediaSize.height }}
        />
      )
    } else {
      const filePath = `${RNFS.DocumentDirectoryPath}/${media.contentId}.jpg`
      Image.getSize(
        `file://${filePath}`,
        (width, height) => setMediaSize({ width, height }),
        (error) => {
          console.error("Failed to load image or unsupported format:", error)
          handleEnd() // Skip to next media
        },
      )
      return (
        <Image
          source={{ uri: `file://${filePath}` }}
          style={{ width: mediaSize.width, height: mediaSize.height }}
        />
      )
    }
  }

  return (
    <Screen style={$root} preset="scroll">
      <Text text="videos" />
      {videos.length > 0 && renderMedia(videos[currentIndex])}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}
