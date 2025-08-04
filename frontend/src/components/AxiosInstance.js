import axios from "axios";
import { jwtDecode } from "jwt-decode";
import dayjs from "dayjs";

const BASE_URL = window._env_.REACT_APP_API_URL + "/api/";

const axiosInstance = axios.create({
  baseURL: BASE_URL
});

axiosInstance.interceptors.request.use(async (req) => {
    let token = localStorage.getItem("accessToken");

    if (token) {
        req.headers.Authorization = `Bearer ${token}`;

        const user = jwtDecode(token);
        const isExpired = dayjs.unix(user.exp).diff(dayjs()) < 1000;

        if (isExpired) {
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const response = await axios.post(`${BASE_URL}token/refresh/`, {
                    refresh: refreshToken,
                });

                localStorage.setItem('accessToken', response.data.access);
                window.location.reload();
            } catch (err) {
                console.error("Token refresh failed:", err);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                throw err;
            }
        }

        req.headers.Authorization = `Bearer ${token}`;
    }

    return req;
});

export default axiosInstance;