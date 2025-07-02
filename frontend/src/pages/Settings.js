import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Checkbox } from '@mui/material';
import { Paper, Box } from '@mui/material';
import axiosInstance from "../components/AxiosInstance";

function Settings() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        username:'',
        email:'',
        password:'',
        benesse:false
    });
    const [successMessage, setSuccessMessage] = useState(false);

    useEffect(() => {
            const checkLoggedIn = async () => {
                try {
                    const token = localStorage.getItem("accessToken");
                    if (token) {
                        const config = {
                            headers: {
                                "Authorization": `Bearer ${token}`
                            }
                        }
                        await axiosInstance.get("api/user/", config)
                        .then((response) => {
                            setUser(response.data);
                            setFormData({
                                username:response.data.username,
                                email:response.data.email,
                                password:'',
                                benesse:response.data.benesse
                            })
                        })
                    }
                    else {
                        setUser(null);
                    }
                }
                catch (error) {
                    setUser(null);
                }
            };
            checkLoggedIn();
        }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]:e.target.value
        })
    };

    const handleBenesseToggle = (e) => {
        setFormData({
            ...formData,
            benesse:e.target.checked
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        try {
            const dataToSend = { ...formData };

            if (dataToSend.password === "") {
                delete dataToSend.password;
            }

            await axiosInstance.patch("api/user/update/", dataToSend)
            .then((response) => {
                setError(null);
                setSuccessMessage(true);
            });
        }
        catch (error) {
            console.error("Registration error: ", error.response);
            if (error.response && error.response.data) {
                const firstField = Object.keys(error.response.data)[0];
                const firstMessage = error.response.data[firstField][0];

                setError(firstMessage);
                setSuccessMessage(false);
            } else {
                setError("An error occurred when trying to update user.");
                setSuccessMessage(false);
            }
        }
        finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout>
            {user ? (
                <div className="d-flex justify-content-center align-items-center vh-100">
                <Box className="p-3" style={{width:"40vw"}} component={Paper} elevation={3}>
                    <div className="d-flex flex-column justify-content-center text-center">
                        <div className="d-flex justify-content-center">
                            <h1>Settings</h1>
                        </div>
                        <form className="d-flex flex-column justify-content-center">
                            <div className="form-outline my-4">
                                <label className="form-label" for="settingsUsername">Username</label>
                                <input className="form-control mx-auto shadow-sm" name="username" value={formData.username} onChange={handleChange} type="username" id="settingsUsername"/>
                            </div>

                            <div className="form-outline my-4">
                                <label className="form-label" for="settingsEmail">Email</label>
                                <input className="form-control mx-auto shadow-sm" name="email" value={formData.email} onChange={handleChange} type="email" id="settingsEmail"/>
                            </div>

                            <div className="form-outline my-4">
                                <label className="form-label" for="settingsPassword">Password</label>
                                <input className="form-control mx-auto shadow-sm" name="password" value={formData.password} onChange={handleChange} type="password" id="settingsPassword"/>
                            </div>

                            <div className="form-outline my-4">
                                <label className="form-label" for="settingsBenesse">Benesse content toggle</label>
                                <Checkbox className="form-control mx-auto" name="benesse" checked={formData.benesse} onChange={handleBenesseToggle} id="settingsBenesse"/>
                            </div>
                            {error && <><p style={{color:'red'}}>{error}</p><br /></>}
                            <button type="submit" className="btn btn-success mx-auto shadow-sm" disabled={isLoading} onClick={handleSubmit}>Update</button>
                            {successMessage && <p className="text-success">Account information updated successfully!</p>}
                        </form>
                    </div>
                </Box>
                </div>
            ) : (
                <p>You must be logged in to view this page.</p>
            )}
        </Layout>
    )
}

export default Settings;