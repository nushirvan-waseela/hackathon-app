import axios from "axios"

const BASE_URL = "https://api.sheety.co/1fe2b1d108fc6e7da0beb403b19f2ae6/hackathon/sheet1"
const AUTH_TOKEN = "Bearer WaseelaWeLoveYou"

export const fetchCMSData = async () => {
  try {
    const response = await axios.get(BASE_URL, {
      headers: { Authorization: AUTH_TOKEN },
    })
    return response.data
  } catch (error) {
    console.error("Error fetching CMS data:", error)
    throw error // Re-throw the error to handle it in the caller
  }
}
