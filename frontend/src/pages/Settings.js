import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Checkbox } from '@mui/material';
import { Paper, Box } from '@mui/material';
import axiosInstance from "../components/AxiosInstance";
import useAuthCheck from "../components/useAuthHook";
import LoadingOrLogin from "../components/LoadingOrLogin";

function Settings() {
    const { user, loadingLogin } = useAuthCheck();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        username:'',
        email:'',
        password:'',
    });
    const [contentToggles, setContentToggles] = useState({});
    const [successMessage, setSuccessMessage] = useState(false);

    useEffect(() => {
        if (!user) return;
        setFormData({
            username:user.username,
            email:user.email,
            password:'',
        })

        axiosInstance.get("user/content-toggles/")
            .then(res => {
                setContentToggles(res.data);
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load content toggles.");
            });
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]:e.target.value
        })
    };

    const handleToggleChange = (toggleName) => {
        setContentToggles(prev => ({
            ...prev,
            [toggleName]: !prev[toggleName]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        try {
            const dataToSend = { ...formData };

            if (dataToSend.password === "") {
                delete dataToSend.password;
            }

            await axiosInstance.patch("user/update/", dataToSend)
            .then((response) => {
                setError(null);
                setSuccessMessage(true);
            });
        }
        catch (error) {
            console.error("Update error: ", error.response);
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

        try {
            axiosInstance.patch("user/content-toggles/update/", contentToggles)
            .then(res => {
                setError(null);
                setSuccessMessage(true);
            })
        }
        catch (error) {
            console.error("Update error: ", error.response);
            if (error.response && error.response.data) {
                const firstField = Object.keys(error.response.data)[0];
                const firstMessage = error.response.data[firstField][0];

                setError(firstMessage);
                setSuccessMessage(false);
            } else {
                setError("An error occurred when trying to update user's content toggles.");
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

                            <div className="mb-2 d-flex flex-column">
                                {Object.entries(contentToggles).filter(([key]) => key !== "id" && key !== "user")
                                .map(([toggleName, value]) => (
                                    <label key={toggleName}>
                                        {toggleName}:
                                        <Checkbox
                                            className="mx-auto"
                                            checked={value}
                                            onChange={() => handleToggleChange(toggleName)}
                                        />
                                    </label>
                                ))}
                            </div>
                            {error && <><p style={{color:'red'}}>{error}</p><br /></>}
                            <button type="submit" className="btn btn-success mx-auto shadow-sm" disabled={isLoading} onClick={handleSubmit}>Update</button>
                            {successMessage && <p className="text-success">Account information updated successfully!</p>}
                        </form>
                    </div>
                </Box>
                </div>
            ) : (
                <LoadingOrLogin loadingLogin={loadingLogin} />
            )}
        </Layout>
    )
}

export default Settings;