import { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
import { fetchCMSData } from "@/services/api/cms"
import { loadString } from "@/utils/storage"
import RNFS from "react-native-fs" // File system library

interface VideosScreenProps extends AppStackScreenProps<"Videos"> {}

export const VideosScreen: FC<VideosScreenProps> = observer(function VideosScreen() {
  const [videos, setVideos] = useState<any[]>([])
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

    // Set an interval to call getData every 10 seconds
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

  return (
    <Screen style={$root} preset="scroll">
      <Text text="videos" />
      {videos.map((video) => (
        <Text key={video.contentId} text={video.title} />
      ))}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}
