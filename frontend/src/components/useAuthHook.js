import { useEffect, useState } from "react";
import axiosInstance from "./AxiosInstance";

function useAuthCheck() {
    const [user, setUser] = useState(false);
    const [loadingLogin, setLoadingLogin] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            setLoadingLogin(true);
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(3000);
            try {
                const token = localStorage.getItem("accessToken");
                if (token) {
                    const config = {
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    }
                    await axiosInstance.get("user/", config)
                    .then((response) => {
                        setUser(response.data);
                    })
                }
                else {
                    setUser(null);
                }
            }
            catch (error) {
                setUser(null);
            }
            setLoadingLogin(false);
        };
        
        checkLoggedIn();
    }, []);

    return { user, loadingLogin }
}

export default useAuthCheck;