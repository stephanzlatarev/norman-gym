import axios from "axios";

const API = "https://ngym.ddns.net/api/";

class Api {

  url(...path) {
    return API + path.join("/");
  }

  async get(...path) {
    try {
      const response = await axios.get(this.url(...path));

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async post(data, ...path) {
    try {
      const response = await axios.post(this.url(...path), data);

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
