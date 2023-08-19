import axios from "axios";

const API = "https://ngym.ddns.net/api/";

class Api {

  async get(entity) {
    try {
      const response = await axios.get(API + entity);

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async post(entity, body) {
    try {
      const response = await axios.post(API + entity, body);

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
