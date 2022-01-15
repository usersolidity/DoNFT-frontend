import axios from "axios";

const api  = axios.create({
    baseURL: process.env.VUE_APP_API_URL,
    timeout: 60000,
})

export default api


export async function getNftInfosByAddress(accountAddress) {
    return (await api.get(`/nfts/${accountAddress}`)).data
}

export async function getEffects() {
    return (await api.get('/effects')).data
}
export async function modifyPicture (objectURL, effectId) { 
    let result = await api.post(`/effects/applyWithImgUrl/${effectId}?img_url=${objectURL}`, "", { 
        headers: { 
            'accept': 'image/gif', 
            'Content-Type': 'text/html', 
        }, 
        responseType: 'blob' 
    }) 

    return URL.createObjectURL(result.data) 
}