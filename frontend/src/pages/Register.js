import { useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from 'react-router-dom';
import { Paper, Box } from '@mui/material';
import axiosInstance from "../components/AxiosInstance";

function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        username:'',
        email:'',
        password:'',
        benesse:false
    });
    const nav = useNavigate();

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
                localStorage.setItem("accessToken", response.data.tokens.access);
                localStorage.setItem("refreshToken", response.data.tokens.refresh);
                nav("/");
            });
        }
        catch (error) {
            console.error("Registration error: ", error.response?.data);
            if (error.response && error.response.data) {
                const firstField = Object.keys(error.response.data)[0];
                const firstMessage = error.response.data[firstField][0];

                setError(firstMessage);
            } else {
                setError("An error occurred when trying to register");
            }
        }
        finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout>
            <div className="d-flex justify-content-center align-items-center" style={{height:"80vh"}}>
            <Box className="p-3" style={{width:"40vw"}} component={Paper} elevation={3}>
                <div className="d-flex flex-column justify-content-center text-center">
                    <div className="d-flex justify-content-center">
                        <h1>Register</h1>
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
                        <button type="submit" className="btn btn-success mx-auto shadow-sm" disabled={isLoading} onClick={handleSubmit}>Register</button>
                    </form>
                </div>
            </Box>
            </div>
        </Layout>
    )
}

export default Register;