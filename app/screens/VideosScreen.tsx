import { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
import { fetchCMSData } from "@/services/api/cms"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "@/models"

interface VideosScreenProps extends AppStackScreenProps<"Videos"> {}

export const VideosScreen: FC<VideosScreenProps> = observer(function VideosScreen() {
  const [videos, setVideos] = useState<any[]>([])

  useEffect(() => {
    const getData = async () => {
      try {
        // Check if data exists in local storage
        const storedData = await AsyncStorage.getItem("CMSData")
        if (storedData) {
          const parsedData = JSON.parse(storedData)
          console.log("Fetched from local storage:", parsedData)
          setVideos(parsedData.sheet1)
        } else {
          // Fetch data from API if not found in storage
          const data = await fetchCMSData()
          console.log("Fetched from API:", data)
          setVideos(data.sheet1)
          await AsyncStorage.setItem("CMSData", JSON.stringify(data))
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }

    getData()
  }, [])

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
