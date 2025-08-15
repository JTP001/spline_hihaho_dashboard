import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import { useVideoFilter } from "../context/VideoFilterContext";
import { BarChart, PieChart } from '@mui/x-charts';
import { IconButton, Menu, MenuItem, Typography, Checkbox, FormControlLabel, Box, Paper, InputBase, Tooltip } from '@mui/material';
import FilterListIcon from "@mui/icons-material/FilterList";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import SearchIcon from '@mui/icons-material/Search';
import SummarizeIcon from '@mui/icons-material/Summarize';
import Select from 'react-select';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel } from "@mui/material";
import dayjs from "dayjs";
import axiosInstance from "../components/AxiosInstance";
import TablePaginationWithJump from "../components/TablePaginationWithJump";
import useAuthCheck from "../components/useAuthHook";
import LoadingOrLogin from "../components/LoadingOrLogin";
import { ThreeDots } from 'react-loading-icons';

var isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

function SessionsView() {
    const { user, loadingLogin } = useAuthCheck();
    const [videos, setVideos] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [browserBotFilter, setBrowserBotFilter] = useState([]);
    const [browserBotToggle, setBrowserBotToggle] = useState(true);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [dataView, setDataView] = useState("Sessions by os");
    const [sessionByOsChart, setSessionByOsChart] = useState("Pie");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("viewer_count");
    const [order, setOrder] = useState("asc");
    const [searchQuery, setSearchQuery] = useState("");
    const [tableFilters, setTableFilters] = useState(["Desktop", "Mobile"]);
    const [anchorFilterMenu, setAnchorFilterMenu] = useState(null); // Anchors the place the filter menu appears in the DOM
    const filterMenuOpen = Boolean(anchorFilterMenu); // Filter menu is open when it is not null
    const piePallette = ["#0dcaef", "sandybrown", "lightgreen", "tomato", "mediumorchid", "khaki", "lightpink", "chocolate", "darksalmon", "aquamarine", "bisque", "green", "purple", "orange", "brown", "darkcyan"];

    //------------------------------Get videos and set filter------------------------------//
    useEffect(() => {
        setLoadingSessions(true);
        axiosInstance.get("videos/")
            .then(res => {
                const videoList = res.data//.sort((a, b) => a.title.localeCompare(b.title, ['en', 'ja']));
                setVideos(videoList);
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingSessions(false));
    }, []);

    useEffect(() => {
        if (!videoFilter && videos.length > 0) {
            setVideoFilter(videos[0].video_id);
        }
    }, [videos, videoFilter, setVideoFilter]);

    const handleSelectVideoFilterChange = (selectOption) => {
        setVideoFilter(selectOption.value);
    };

    //----------------------------------Get session views----------------------------------//
    useEffect(() => {
        if (!videoFilter) return; // Ignore any attempts to call this before videoFilter is set

        setLoadingSessions(true);
        axiosInstance.get(`videos/${videoFilter}/view_sessions/`)
            .then(res => {
                setSessions(res.data);
                setPageNum(0);
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingSessions(false));
    }, [videoFilter]);

    //----------------------------------Handle filtering----------------------------------//
    const filteredSessions = useMemo(() => {
        const searchTerms = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(term =>
            term.replace(/"/g, "").toLowerCase()
        ) || []; // Creates a list of search terms from the query of all words or strings in quotes split by spaces

        return sessions.filter((session) => {
            const viewer_os = session.viewer_os.toLowerCase();
            const viewer_browser = session.viewer_browser.toLowerCase();

            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => 
                viewer_os.includes(term) || viewer_browser.includes(term)
            );

            const matchesFilters = session.viewer_mobile ? 
                tableFilters.includes("Mobile") : 
                tableFilters.includes("Desktop")

            return matchesSearch && matchesFilters;
        });
    }, [sessions, searchQuery, tableFilters]);

    //--------------------Create 'session by os' chart data--------------------//
    const sessionsByOs = filteredSessions.reduce((session_counts, session) => {
        const key = session.viewer_os;
        if (!session_counts[key]) {
            session_counts[key] = 0;
        }
        session_counts[key] += 1;
        return session_counts
    }, {});

    const osCountsBarChartData = Object.entries(sessionsByOs).map(([os, session_counts]) => ({
        os,
        session_counts,
    })).sort((a, b) => b.session_counts - a.session_counts);

    const osCountsPiePercentData = osCountsBarChartData.reduce((sum, grouping) => sum += grouping.session_counts, 1);

    const osCountsPieChartData = osCountsBarChartData.map((grouping, index) => {
        const percent = ((grouping.session_counts/osCountsPiePercentData) * 100).toFixed(1);
        return {id:index, value:grouping.session_counts, label:`${grouping.os}: ${percent}%`};
    });

    //--------------------Create 'session by os' chart data--------------------//
    const sessionsByBrowser = browserBotFilter.reduce((session_counts, session) => {
        let browser = session.viewer_browser;
        if (browser.includes("Chrome")) { // Groups in mobile versions of these browsers to be the same browser, mobile done differently
            browser = "Chrome";
        } else if (browser.includes("Facebook")) {
            browser = "Facebook";
        } else if (browser.includes("Edge")) {
            browser = "Edge";
        } else if (browser.includes("Safari")) {
            browser = "Safari";
        } else if (browser.includes("Firefox")) {
            browser = "Firefox";
        } else if (browser.includes("IE")) {
            browser = "IE"
        } else if (browser.includes("Bing")) {
            browser = "Bing"
        }

        const device_type = session.viewer_mobile ? "mobile" : "desktop"

        if (!session_counts[browser]) {
            session_counts[browser] = {"mobile": 0, "desktop": 0};
        }
        session_counts[browser][device_type] += 1;
        return session_counts
    }, {});

    const browserCountsBarChartData = Object.entries(sessionsByBrowser).map(([browser, session_counts]) => ({
        browser,
        ...session_counts,
    })).sort((a, b) => b.session_counts - a.session_counts);

    const deviceCounts = filteredSessions.reduce((device_counts, session) => {
        if (session.viewer_mobile) device_counts.mobile += 1;
        else device_counts.desktop += 1;
        return device_counts;
    }, {mobile:0, desktop:0});

    //----------------------------------Handle pagination----------------------------------//
    const handleChangePage = (event, newPageNum) => {
        setPageNum(newPageNum);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPageNum(0);
    };

    //----------------------------------Handle table sort----------------------------------//
    const handleTableSort = (column) => {
        const isDesc = orderBy === column && order === "desc";
        setOrder(isDesc ? "asc" : "desc");
        setOrderBy(column);
    };
    
    const descendingComparator = (a, b, orderBy) => {
        const a_val = a[orderBy];
        const b_val = b[orderBy];

        if (typeof a_val === "string" && typeof b_val === "string") {
            return b_val.localeCompare(a_val, ['en', 'ja']);
        }

        if (b_val < a_val) return -1;
        if (b_val > a_val) return 1;
        return 0;
    };

    const getTableComparator = (order, orderBy) => {
        return order === "asc" 
            ? (a, b) => descendingComparator(a, b, orderBy)
            : (a, b) => -descendingComparator(a, b, orderBy);
    };

    //--------------------------------Handle extra filters--------------------------------//
    const handleFilterToggle = (value) => {
        setTableFilters((prev) => 
            prev.includes(value) 
                ? prev.filter((val) => val !== value) // Removes value from filters list if it was in it
                : [...prev, value] // Adds value to filters list if it was not in it
        );
    }
    
    useEffect(() => {
        setBrowserBotFilter(filteredSessions);

        if (browserBotToggle) {
            const no_bots = filteredSessions.filter((session) => !session.is_bot);
            setBrowserBotFilter(no_bots)
        }
    }, [filteredSessions, browserBotToggle]);

    //-------------------------------Rendered page elements-------------------------------//
    return (
        <Layout>
            {user ? (
                <div className="container rounded min-vh-100">
                    <div className="mx-3 d-flex flex-column justify-content-center">
                        <div className="my-3 d-flex flex-row justify-content-center">
                            <h1>Session User Details</h1>
                        </div>
                        <h3 className="mx-auto">Showing session user data from: </h3>
                        <div className="my-2 d-flex flex-row flex-wrap justify-content-center align-items-center">
                            <Paper className="w-75" elevation={2}>
                                <Select 
                                    className="basic-single" 
                                    classNamePrefix="select"
                                    value={videos.map(video => ({
                                        value: video.video_id,
                                        label: `${video.title} (ID: ${video.video_id})`
                                    })).find(option => option.value === videoFilter)}
                                    isSearchable={true}
                                    name="Video selection"
                                    options={videos.map(video => ({
                                        value:video.video_id,
                                        label:`${video.title} (ID: ${video.video_id})`,
                                    }))}
                                    onChange={handleSelectVideoFilterChange}
                                    styles={{menu:(provided) => ({...provided, zIndex:1500})}}
                                />
                            </Paper>
                            <Paper className="mx-3 rounded-5" elevation={2}>
                                <Tooltip arrow title="Filter for this video in Summary" placement="top">
                                    <Link to="/summary/" state={{videoIdFromOtherPageFlag:true}}><IconButton><SummarizeIcon/></IconButton></Link>
                                </Tooltip>
                            </Paper>
                        </div>
                        <div className="my-4 d-flex flex-row flex-wrap justify-content-around">
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Sessions by os")}>Sessions by os</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Sessions by browser")}>Sessions by browser</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Device breakdown")}>Device breakdown</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Sessions table")}>Sessions table</button>
                        </div>
                        {dataView === "Sessions table" &&
                            <div className="d-flex flex-column">
                            <div className="mb-3 d-flex flex-row justify-content-center flex-wrap align-items-center">
                                <Paper elevation={2} component="form" className="p-2 mx-3 w-50 d-flex align-items-center">
                                    <SearchIcon className="mx-2" />
                                    <InputBase 
                                        className="flex-grow-1"
                                        placeholder="Search sessions" 
                                        inputProps={{ 'aria-label': 'search sessions' }} 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                    />
                                </Paper>
                                <Paper className="d-flex justify-content-center rounded-5" elevation={2}>
                                    <IconButton onClick={(e) => setAnchorFilterMenu(anchorFilterMenu ? null : e.currentTarget)}>
                                        <FilterListIcon />
                                    </IconButton>
                                    <Menu anchorEl={anchorFilterMenu} open={filterMenuOpen} onClose={() => setAnchorFilterMenu(null)}>
                                        <MenuItem disabled>
                                            <Typography variant="subtitle1">Filter Options</Typography>
                                        </MenuItem>
                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                            <FormControlLabel 
                                                control={
                                                    <Checkbox 
                                                        checked={tableFilters.includes("Desktop")} 
                                                        onChange={() => handleFilterToggle("Desktop")}
                                                    />
                                                }
                                                label={"Desktop"}
                                            />
                                            <FormControlLabel 
                                                control={
                                                    <Checkbox 
                                                        checked={tableFilters.includes("Mobile")} 
                                                        onChange={() => handleFilterToggle("Mobile")}
                                                    />
                                                }
                                                label={"Mobile"}
                                            />
                                        </Box>
                                    </Menu>
                                </Paper>
                            </div>
                            <TableContainer component={Paper} elevation={3}>
                                <Table aria-label="Sessions table">
                                    <TableHead>
                                        <TableRow className="bg-info-subtle">
                                            <TableCell align="center">OS</TableCell>
                                            <TableCell align="center">Browser</TableCell>
                                            <TableCell align="center">Desktop or Mobile</TableCell>
                                            <TableCell align="center">Device Model</TableCell>
                                            <TableCell align="center">User or Bot</TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "viewer_count"}
                                                    direction={orderBy === "viewer_count" ? order : "desc"}
                                                    onClick={() => handleTableSort("viewer_count")}
                                                >
                                                    Number of Users
                                                </TableSortLabel>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {[...filteredSessions].sort(getTableComparator(order, orderBy))
                                            .slice(pageNum*rowsPerPage, pageNum*rowsPerPage + rowsPerPage)
                                            .map((session, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="border" align="center">{session.viewer_os} {session.os_version}</TableCell>
                                                <TableCell className="border" align="center">{session.viewer_browser} {session.browser_version}</TableCell>
                                                <TableCell className="border" align="center">{session.viewer_mobile ? "Mobile" : "Desktop"}</TableCell>
                                                <TableCell className="border" align="center">{session.viewer_device}</TableCell>
                                                <TableCell className="border" align="center">{session.is_bot ? "Bot" : "User"}</TableCell>
                                                <TableCell className="border" align="center">{session.viewer_count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={filteredSessions.length}
                                    rowsPerPage={rowsPerPage}
                                    page={pageNum}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                    showFirstButton
                                    showLastButton
                                    ActionsComponent={TablePaginationWithJump}
                                    sx={{
                                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                        marginBottom: 0,
                                        }
                                    }}
                                />
                            </TableContainer>
                            </div>
                        } {dataView === "Sessions by os" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center flex-wrap">
                                <div className="my-3 d-flex flex-row justify-content-around">
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setSessionByOsChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setSessionByOsChart("Bar")}>Bar Chart</button>
                                </div>
                            </div>
                            {loadingSessions === true ? (
                                <div className="d-flex flex-column text-center">
                                    <h5>Loading...</h5>
                                    <ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={150}/>
                                </div>
                            ) : (filteredSessions.length > 0 ? (
                                <>
                                {sessionByOsChart === "Pie" &&
                                    <>
                                    <h6 className="text-center">Sessions by OS Pie Chart</h6>
                                    <PieChart 
                                        colors={piePallette}
                                        series={[{
                                            arcLabel:(grouping) => `${grouping.label} (${grouping.value})`,
                                            data: osCountsPieChartData,
                                            arcLabelMinAngle:35
                                        }]}
                                        width={700}
                                        height={400}
                                    />
                                    </>
                                } {sessionByOsChart === "Bar" &&
                                    <BarChart 
                                        xAxis={[{label:"OS used", data: osCountsBarChartData.map(grouping => grouping.os)}]}
                                        yAxis={[{label:"Number of sessions", width:60}]}
                                        series={[{label:"Total number of sessions per os", data: osCountsBarChartData.map(grouping => grouping.session_counts), color:"#0dcaef"}]}
                                        width={700}
                                        height={400}
                                        slotProps={{
                                            axisLabel: {
                                            style: {
                                                fontWeight: 'bold',
                                                fontSize: '16px',
                                            },
                                            },
                                        }}
                                    />
                                }
                                </>
                            ) : (
                                <Paper className="mt-4 mx-auto d-flex flex-row flex-wrap justify-content-center rounded-5 p-3" elevation={2}>
                                    <HighlightOffIcon className="mx-2"/>
                                    <h5>No session data to display</h5>
                                </Paper>
                            ))}
                            </div>
                        } {dataView === "Sessions by browser" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center flex-wrap">
                                <FormControlLabel className="my-3"
                                    control={
                                        <Checkbox 
                                            checked={browserBotToggle} 
                                            onChange={() => setBrowserBotToggle(!browserBotToggle)}
                                        />
                                    }
                                    label={"Exclude bots and scrapers"}
                                />
                            </div>
                            {loadingSessions === true ? (
                                <div className="d-flex flex-column text-center">
                                    <h5>Loading...</h5>
                                    <ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={150}/>
                                </div>
                            ) : (filteredSessions.length > 0 ? (
                                <BarChart 
                                    xAxis={[{label:"Browser used", data: browserCountsBarChartData.map(grouping => grouping.browser)}]}
                                    yAxis={[{label:"Number of sessions", width:60}]}
                                    series={[
                                        {label:"Sessions per browser (Desktop)", data: browserCountsBarChartData.map(grouping => grouping.desktop), color:"#0dcaef", stack:'a'},
                                        {label:"Sessions per browser (Mobile)", data: browserCountsBarChartData.map(grouping => grouping.mobile), color:"lightgreen", stack:'a'}
                                    ]}
                                    width={800}
                                    height={400}
                                    slotProps={{
                                        axisLabel: {
                                        style: {
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                        },
                                        },
                                    }}
                                />
                            ) : (
                                <Paper className="mt-4 mx-auto d-flex flex-row flex-wrap justify-content-center rounded-5 p-3" elevation={2}>
                                    <HighlightOffIcon className="mx-2"/>
                                    <h5>No session data to display</h5>
                                </Paper>
                            ))}
                            </div>
                        } {dataView === "Device breakdown" &&
                            <div className="d-flex flex-column">
                            {loadingSessions === true ? (
                                <div className="d-flex flex-column text-center">
                                    <h5>Loading...</h5>
                                    <ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={150}/>
                                </div>
                            ) : (filteredSessions.length > 0 ? (
                                <div className="d-flex flex-column">
                                    <h6 className="text-center">Device Breakdown Pie Chart</h6>
                                    <PieChart
                                        colors={piePallette}
                                        series={[{
                                            arcLabel:(grouping) => `${grouping.label} (${grouping.value})`,
                                            data: [
                                                {id:0, value:deviceCounts.mobile, label:`Mobile: ${((deviceCounts.mobile/Math.max(filteredSessions.length, 1))*100).toFixed(1)}%`},
                                                {id:1, value:deviceCounts.desktop, label:`Desktop: ${((deviceCounts.desktop/Math.max(filteredSessions.length, 1))*100).toFixed(1)}%`}
                                            ].sort((a, b) => b.value - a.value),
                                            arcLabelMinAngle:35
                                        }]}
                                        width={700}
                                        height={400}
                                    />
                                </div>
                            ) : (
                                <Paper className="mt-4 mx-auto d-flex flex-row flex-wrap justify-content-center rounded-5 p-3" elevation={2}>
                                    <HighlightOffIcon className="mx-2"/>
                                    <h5>No session data to display</h5>
                                </Paper>
                            ))}
                            </div>
                        }
                        
                    </div>
                </div>
            ) : (
                <LoadingOrLogin loadingLogin={loadingLogin} />
            )}
        </Layout>
    )
}

export default SessionsView;