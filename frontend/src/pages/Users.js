import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { Paper, Box, InputBase } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link } from "react-router-dom";
import axiosInstance from "../components/AxiosInstance";
import useAuthCheck from "../components/useAuthHook";
import { ThreeDots } from 'react-loading-icons';

function Users() {
    const { user, loadingLogin } = useAuthCheck();
    const [userList, setUserList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        axiosInstance.get("user/list/")
            .then(res => {
                setUserList(res.data);
            })
            .catch(err => {
                console.error(err);
            })
    }, [])

    const filteredUsers = useMemo(() => {
        const searchTerms = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(term =>
            term.replace(/"/g, "").toLowerCase()
        ) || []; // Creates a list of search terms from the query of all words or strings in quotes split by spaces

        return userList.filter((listUser) => {
            const id = listUser.id.toString();
            const username = listUser.username.toLowerCase();
            const email = listUser.email.toLowerCase();

            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => 
                id.includes(term) || username.includes(term) || email.includes(term)
            );

            return matchesSearch
        });
    }, [userList, searchQuery]);

    const handleDeleteUser = (id) => {
        axiosInstance.delete(`user/delete/${id}/`)
        .then(() => {
            setUserList((prev) => prev.filter(listUser => listUser.id !== id));
            setError(null);
        })
        .catch(err => setError(err));
    }

    return (
        <Layout>
            {user && user.is_superuser ? (
                <div className="d-flex flex-column">
                    <div className="mx-auto my-2">
                        <h1>Users</h1>
                    </div>
                    <div className="d-flex flex-row justify-content-center align-items-center">
                        <Paper elevation={2} className="my-2 mx-2 p-2 w-50 d-flex align-items-center">
                            <SearchIcon className="mx-2" />
                            <InputBase 
                                className="flex-grow-1"
                                placeholder="Search users" 
                                inputProps={{ 'aria-label': 'search users' }} 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </Paper>
                        <Link to={"/register/"}>
                            <button className="mx-2 p-2 btn btn-success">Register user</button>
                        </Link>
                    </div>
                    {filteredUsers.slice(0, 10).map(listUser => (
                        <Box key={listUser.id} className="my-2 mx-auto w-75">
                            <Paper className="p-2 bg-info-subtle">
                                <div className="d-flex flex-row justify-content-around align-items-center">
                                    <div className="d-flex flex-column">
                                        <p>Id:</p>
                                        <h6>{listUser.id}</h6>
                                    </div>
                                    <div className="d-flex flex-column flex-grow-1" style={{"max-width":"30%", whiteSpace: "normal", wordBreak: "break-word"}}>
                                        <p>Username:</p>
                                        <h6>{listUser.username}</h6>
                                    </div>
                                    <div className="d-flex flex-column flex-grow-1" style={{"max-width":"30%", whiteSpace: "normal", wordBreak: "break-word"}}>
                                        <p>Email:</p>
                                        <h6>{listUser.email || "No email"}</h6>
                                    </div>
                                    <div className="d-flex flex-column">
                                        <button className="btn" style={{"background-color":"tomato", color:"white"}} onClick={() => handleDeleteUser(listUser.id)}>
                                            Delete
                                        </button>
                                        {error && <><p style={{color:'red'}}>{error}</p></>}
                                    </div>
                                </div>
                            </Paper>
                        </Box>
                    ))}
                    {filteredUsers.length >= 10 && <h6 className="mx-auto my-1">*Showing only the first 10 users, use the search bar to filter</h6>}
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

export default Users;