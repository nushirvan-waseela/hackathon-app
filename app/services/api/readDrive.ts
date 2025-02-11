import axios from "axios"

// const DRIVE_FILE_ID = "1iGBM2BMDGxsY-g53a9w9szFBqex_ZR6J"
// const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`
// Alternative format for viewing:
// const DRIVE_URL = `https://drive.google.com/file/d/${DRIVE_FILE_ID}/view?usp=sharing`;

export const fetchDriveData = async (url: string) => {
  try {
    console.log("🔥 ~ fetchDriveData ~ url: ", url)
    const urlParts = url.split("id=/")
    const driveId = urlParts[1]
    const response = await axios.get(`https://drive.google.com/uc?export=download&id=${driveId}`)

    console.log("🔥 ~ fetchDriveData ~ response: ", response)
    // Depending on your file type, you might need different parsing
    // For JSON:
    const data = response.data

    // For CSV:
    // const data = response.data.split('\n').map(row => row.split(','));

    console.log("Fetched Drive Data:", data)
    return data
  } catch (error) {
    console.error("Error fetching drive data:", error)
    throw error
  }
}
