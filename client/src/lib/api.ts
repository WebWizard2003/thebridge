import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Recursively map server's `avatar` field to `avatarUrl` expected by client types
function mapAvatarFields(data: any): any {
  if (data === null || data === undefined || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(mapAvatarFields);
  const result: any = {};
  for (const key in data) {
    if (key === "avatar" && (typeof data[key] === "string" || data[key] === null)) {
      result["avatarUrl"] = data[key];
    } else {
      result[key] = mapAvatarFields(data[key]);
    }
  }
  return result;
}

api.interceptors.response.use(
  (response) => {
    response.data = mapAvatarFields(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth-token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
