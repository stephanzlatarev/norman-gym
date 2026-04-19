import axios from "axios";

const API = "https://gym.superskill.me/api/";

const listeners = new Map();

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

  async delete(...path) {
    try {
      const response = await axios.delete(this.url(...path));

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.error(error);
    }
  }

  listen(component, entity) {
    if (entity) {
      let entities = listeners.get(component);

      if (!entities) {
        entities = new Set();

        listeners.set(component, entities);
      }

      entities.add(entity);

      refresh(component, entity);
    } else {
      listeners.delete(component);
    }
  }

}

const api = new Api();

async function refresh(component, entity) {
  component.setState({ [entity]: await api.get(entity) });
}

setInterval(async function() {
  for (const [listener, entities] of listeners) {
    for (const entity of entities) {
      refresh(listener, entity);
    }
  }
}, 10000);

export default api;
