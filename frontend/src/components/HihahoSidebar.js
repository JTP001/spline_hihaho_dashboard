import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import { IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axiosInstance from './AxiosInstance';
import HomeIcon from '@mui/icons-material/Home';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SplineLogo from "../media/spline_transparent.png";

function HihahoSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const nav = useNavigate();

    const handleCollapseToggle = () => {
        setCollapsed(!collapsed);
    };

    const handleLogout = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");
            const accessToken = localStorage.getItem("accessToken");

            if (refreshToken && accessToken) {
                const config = {
                    headers: {
                        "Authorization": `Bearer ${accessToken}`
                    }
                };
                await axiosInstance.post("api/logout/", {'refresh': refreshToken}, config)
                localStorage.removeItem("accessToken");
                localStorage.removeItem('refreshToken');
                nav("/login/");
            }
        }
        catch (error) {
            console.log("Logout failed.");
        }
    }

    return (
        <div className='min-vh-100 bg-body-secondary'>
            <Sidebar collapsed={collapsed} backgroundColor='#e9ecef'>
                <Menu className=''>
                    <MenuItem
                        className="mt-2"
                        onClick={handleCollapseToggle}
                        icon={
                        <IconButton>
                            <MenuIcon />
                        </IconButton>
                        }
                    >
                        {!collapsed && <img src={SplineLogo} alt="Spline Logo" />}
                    </MenuItem>
                    <hr className="mx-3" style={{borderWidth: "3px"}} />
                    <MenuItem component={<Link />} to="/summary/" icon={<SummarizeIcon />}> Summary </MenuItem>
                    <MenuItem component={<Link />} to="/interactions/" icon={<AdsClickIcon />}> Interactions </MenuItem>
                    <MenuItem component={<Link />} to="/monthlyview/" icon={<SsidChartIcon />}> Monthly Data </MenuItem>
                    <MenuItem component={<Link />} to="/sessionsview/" icon={<SlideshowIcon />}> Sessions Data </MenuItem>
                    <hr className="mx-3" style={{borderWidth: "3px"}} />
                    <MenuItem component={<Link />} to="/login/" icon={<LoginIcon />}> Login </MenuItem>
                    <MenuItem component={<Link />} to="/register/" icon={<PersonAddIcon />}> Register </MenuItem>
                    <MenuItem component={<Link />} to="/user/update/" icon={<SettingsIcon />}> Settings </MenuItem>
                    <MenuItem onClick={handleLogout} component={<Link />} icon={<LogoutIcon />} to="/login"> Log out </MenuItem>
                </Menu>
            </Sidebar>
        </div>
    )
}

export default HihahoSidebar;