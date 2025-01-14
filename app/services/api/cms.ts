import axios from "axios"

const BASE_URL = "https://api.sheety.co/1fe2b1d108fc6e7da0beb403b19f2ae6/hackathon/sheet1"
const AUTH_TOKEN = "Bearer WaseelaWeLoveYou"

export const fetchCMSData = async (tvID: string) => {
  try {
    const response = await axios.get(BASE_URL, {
      headers: { Authorization: AUTH_TOKEN },
    })
    console.log("+++++++++++++++++++++++++++++++++++")
    console.log("unfiltered api rsponse: ", response.data)
    console.log("+++++++++++++++++++++++++++++++++++")
    // Filter the rows that contain the given tvID
    const filteredData = response.data.sheet1.filter((item: any) => {
      console.log("Comparing tvId:", typeof item.tvId, "with id:", typeof tvID)
      return item.tvId === Number(tvID)
    })

    console.log("====> filtered data: ", filteredData)
    // Return only the filtered rows
    return {
      ...response.data,
      sheet1: filteredData,
    }
  } catch (error) {
    console.error("Error fetching CMS data:", error)
    throw error // Re-throw the error to handle it in the caller
  }
}
