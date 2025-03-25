import axios from "axios"

export const fetchDriveData = async (url: string) => {
  try {
    const urlParts = url.split("id=/")
    const driveId = urlParts[1]
    const response = await axios.get(`https://drive.google.com/uc?export=download&id=${driveId}`)
    const data = response.data
    return data
  } catch (error) {
    console.error("Error fetching drive data:", error)
    throw error
  }
}
