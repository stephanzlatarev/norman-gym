import axios from "axios";

const API = "https://ngym.ddns.net/api/";

class Api {

  url(entity, object) {
    return API + entity + (object ? "/" + object : "");
  }

  async get(entity, object) {
    try {
      const response = await axios.get(this.url(entity, object));

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async post(entity, body) {
    try {
      const response = await axios.post(this.url(entity), body);

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.error(error);
    }
  }

}

const api = new Api();

export default api;
