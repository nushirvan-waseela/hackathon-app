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
        // Check if data exists in local storage
        const storedData = await AsyncStorage.getItem("CMSData")
        if (storedData) {
          const parsedData = JSON.parse(storedData)
          console.log("Fetched from local storage:", parsedData)

          // Fetch new data from the API
          const data = await fetchCMSData(id || "")
          console.log("Fetched from API:", data)

          // Replace the stored data with the latest data from the API
          const updatedData = {
            sheet1: data.sheet1,
          }

          // Download the files and log the updates
          await downloadFiles(data.sheet1)

          // Update the state with the latest data and save to storage
          setVideos(updatedData.sheet1)
          await AsyncStorage.setItem("CMSData", JSON.stringify(updatedData))
          console.log("Data updated in storage:", updatedData)
        } else {
          // Fetch data from API if not found in storage
          const data = await fetchCMSData(id || "")
          console.log("Fetched from API:", data)

          // Download the files and log the updates
          await downloadFiles(data.sheet1)

          setVideos(data.sheet1)
          await AsyncStorage.setItem("CMSData", JSON.stringify(data))
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }

    // Call getData initially
    getData()

    // Set an interval to call getData every 3 seconds
    const intervalId = setInterval(getData, 3000)

    // Cleanup the interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  // Function to handle downloading files and logging the process
  const downloadFiles = async (videos: any[]) => {
    for (const video of videos) {
      const filePath = `${RNFS.DocumentDirectoryPath}/${video.contentId}.jpg` // Example file path (you may want to adjust this based on file type)
      const fileExists = await RNFS.exists(filePath)

      if (!fileExists) {
        console.log(`Download started for item URL: ${video.link}`)

        // Start the download
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

  // Function to handle moving to the next media in the loop
  const handleEnd = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length) // Loop back to the first item once we reach the last
  }

  // Function to render the media (video or image)
  const renderMedia = (media: any) => {
    // const filePath = `${RNFS.DocumentDirectoryPath}/${media.contentId}.jpg`
    console.log(
      "__________________________________________________________________________________________",
    )
    console.log("===> vidoes: ", videos)
    console.log(
      "__________________________________________________________________________________________",
    )
    console.log("----> media: ", media)
    if (media.type === "video") {
      const filePath = `${RNFS.DocumentDirectoryPath}/${media.contentId}.jpg`
      return (
        <Video
          source={{ uri: filePath }}
          ref={videoPlayer}
          onEnd={handleEnd}
          onLoad={(data) => {
            // Update media size based on original video dimensions
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
        (width, height) => {
          // Update media size based on original image dimensions
          setMediaSize({ width, height })
        },
        (error) => {
          console.error("Failed to get image size:", error)
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
      {videos.length > 0 && renderMedia(videos[0])}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}
