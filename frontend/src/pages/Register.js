import { useState } from "react";
import Layout from "../components/Layout";
import { Paper, Box } from '@mui/material';
import axiosInstance from "../components/AxiosInstance";
import useAuthCheck from "../components/useAuthHook";
import { ThreeDots } from 'react-loading-icons';

function Register() {
    const { user, loadingLogin } = useAuthCheck();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [formData, setFormData] = useState({
        username:'',
        email:'',
        password:'',
        benesse:false
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]:e.target.value
        })
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading){
            return
        }
        setIsLoading(true);

        try {
            await axiosInstance.post("register/", formData)
            .then((response) => {
                setError(null);
                setSuccess("User successfully registered!")
            });
        }
        catch (error) {
            console.error("Registration error: ", error.response?.data);
            if (error.response && error.response.data) {
                const firstField = Object.keys(error.response.data)[0];
                const firstMessage = error.response.data[firstField][0];

                setError(firstMessage);
                setSuccess(null);
            } else {
                setError("An error occurred when trying to register");
                setSuccess(null);
            }
        }
        finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout>
            {user && user.is_superuser ? (
                <div className="d-flex justify-content-center align-items-center" style={{height:"80vh"}}>
                <Box className="p-3" style={{width:"40vw"}} component={Paper} elevation={3}>
                    <div className="d-flex flex-column justify-content-center text-center">
                        <div className="d-flex justify-content-center">
                            <h1>Register a user</h1>
                        </div>
                        <form className="d-flex flex-column justify-content-center">
                            <div className="form-outline my-4">
                                <label className="form-label" for="registerUsername">Username</label>
                                <input className="form-control mx-auto shadow-sm" name="username" value={formData.username} onChange={handleChange} type="username" id="registerUsername"/>
                            </div>

                            <div className="form-outline my-4">
                                <label className="form-label" for="registerEmail">Email</label>
                                <input className="form-control mx-auto shadow-sm" name="email" value={formData.email} onChange={handleChange} type="email" id="registerEmail"/>
                            </div>

                            <div className="form-outline my-4">
                                <label className="form-label" for="registerPassword">Password</label>
                                <input className="form-control mx-auto shadow-sm" name="password" value={formData.password} onChange={handleChange} type="password" id="registerPassword"/>
                            </div>
                            {error && <><p style={{color:'red'}}>{error}</p><br /></>}
                            {success && <><p style={{color:'green'}}>{success}</p><br /></>}
                            <button type="submit" className="btn btn-success mx-auto shadow-sm" disabled={isLoading} onClick={handleSubmit}>Register</button>
                        </form>
                    </div>
                </Box>
                </div>
            ) : (
                <div className="my-3 d-flex flex-column text-center justify-content-center">
                    {loadingLogin ? (
                        <>
                            <h5>Loading...</h5>
                            <ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={150}/>
                        </>
                    ) : (
                        <h4>You must be logged in as an admin to view this page.</h4>
                    )}
                </div>
            )}
        </Layout>
    )
}

export default Register;