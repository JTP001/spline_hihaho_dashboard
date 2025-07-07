import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { useVideoFilter } from "../context/VideoFilterContext";
import { BarChart, PieChart, LineChart } from '@mui/x-charts';
import { IconButton, Menu, MenuItem, Typography, Checkbox, FormControlLabel, Box } from '@mui/material';
import FilterListIcon from "@mui/icons-material/FilterList";
import Select from 'react-select';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel } from "@mui/material";
import { Paper, InputBase } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import dayjs from "dayjs";
import axiosInstance from "../components/AxiosInstance";
import CustomDatePicker from "../components/CustomDatePicker";

var isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

function SessionsView() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [videos, setVideos] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [browserBotFilter, setBrowserBotFilter] = useState([]);
    const [browserBotToggle, setBrowserBotToggle] = useState(true);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [bucketSize, setBucketSize] = useState(1);
    const [bucketArray, setBucketArray] = useState([]);
    const [dataView, setDataView] = useState("Sessions by os");
    const [sessionByOsChart, setSessionByOsChart] = useState("Pie");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("session_id");
    const [order, setOrder] = useState("asc");
    const [searchQuery, setSearchQuery] = useState("");
    const [tableFilters, setTableFilters] = useState(["Desktop", "Mobile"]);
    const [anchorFilterMenu, setAnchorFilterMenu] = useState(null); // Anchors the place the filter menu appears in the DOM
    const filterMenuOpen = Boolean(anchorFilterMenu); // Filter menu is open when it is not null
    const [startDate, setStartDate] = useState(dayjs("2020-01-01"));
    const [endDate, setEndDate] = useState(dayjs());
    const piePallette = ["#0dcaef", "sandybrown", "lightgreen", "tomato", "mediumorchid", "khaki", "lightpink", "chocolate", "darksalmon"];

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
                        setIsLoggedIn(true);
                    })
                }
                else {
                    setIsLoggedIn(false);
                }
            }
            catch (error) {
                setIsLoggedIn(false);
            }
        };
        checkLoggedIn();
    }, []);

    useEffect(() => {
        axiosInstance.get("videos/")
            .then(res => {
                const videoList = res.data//.sort((a, b) => a.title.localeCompare(b.title, ['en', 'ja']));
                setVideos(videoList);
            })
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!videoFilter && videos.length > 0) {
            setVideoFilter(videos[0].video_id);
        }
    }, [videos, videoFilter, setVideoFilter]);

    useEffect(() => {
        if (!videoFilter) return; // Ignore any attempts to call this before videoFilter is set

        axiosInstance.get(`videos/${videoFilter}/view_sessions/`)
            .then(res => {
                const sessionData = res.data.map(session => ({
                    ...session,
                    started_at: session.started_time_unix !== 0 ? dayjs.unix(session.started_time_unix) : null,
                    ended_at: session.ended_time_unix !== 0 ? dayjs.unix(session.ended_time_unix) : null
                }));
                setSessions(sessionData);
                setPageNum(0);

                // Get the video duration and prepare the line chart data only after interactions is fetched
                if (videoFilter) {
                axiosInstance.get(`videos/${videoFilter}/stats/`)
                    .then(res => {
                        const bucketSizeSeconds = Math.max(1, Math.round((res.data[0].video_duration_seconds * 0.05)*100/100));
                        const bucketItems = new Array(Math.ceil(res.data[0].video_duration_seconds / bucketSizeSeconds)).fill(0);

                        sessionData.forEach(session => {
                            const bucketIndex = Math.floor(session.last_reached_seconds / bucketSizeSeconds);
                            if (bucketIndex >= 0 && bucketIndex < bucketItems.length) {
                                bucketItems[bucketIndex] += 1;
                            } else {
                                console.error(
                                    `Skipping session with last_reached_seconds ${session.last_reached_seconds}, `
                                    + `bucketIndex ${bucketIndex}, video duration: ${res.data[0].video_duration_seconds}`
                                );
                            }
                        });
                        setBucketSize(bucketSizeSeconds)
                        setBucketArray(bucketItems);
                    })
                }
            })
            .catch(err => console.error(err));
    }, [videoFilter])

    const handleSelectVideoFilterChange = (selectOption) => {
        setVideoFilter(selectOption.value);
    }

    const filteredSessions = useMemo(() => {
        const searchTerms = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(term =>
            term.replace(/"/g, "").toLowerCase()
        ) || []; // Creates a list of search terms from the query of all words or strings in quotes split by spaces

        return sessions.filter((session) => {
            const id = session.session_id.toString();
            const viewer_os = session.viewer_os.toLowerCase();
            const viewer_browser = session.viewer_browser.toLowerCase();

            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => 
                id.includes(term) || viewer_os.includes(term) || viewer_browser.includes(term)
            );

            const matchesDate = 
                session.started_at.isSameOrAfter(startDate.startOf("day")) && 
                session.started_at.isSameOrBefore(endDate.endOf("day"));
                
            const matchesFilters = session.viewer_mobile ? 
                tableFilters.includes("Mobile") : 
                tableFilters.includes("Desktop")

            return matchesSearch && matchesDate && matchesFilters;
        });
    }, [sessions, searchQuery, startDate, endDate, tableFilters]);

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

    const osCountsPiePercentData = osCountsBarChartData.reduce((sum, grouping) => sum += grouping.session_counts, 0);

    const osCountsPieChartData = osCountsBarChartData.map((grouping, index) => {
        const percent = ((grouping.session_counts/osCountsPiePercentData) * 100).toFixed(1);
        return {id:index, value:grouping.session_counts, label:`${grouping.os}: ${percent}%`};
    });

    useEffect(() => {
        setBrowserBotFilter(filteredSessions);

        if (browserBotToggle) {
            const no_bots = filteredSessions.filter((session) => 
                !session.viewer_browser.toLowerCase().includes("bot") && 
                !session.viewer_browser.toLowerCase().includes("crawler") && 
                !session.viewer_browser.toLowerCase().includes("proxy") &&
                !session.viewer_browser.toLowerCase().includes("spider")
            );
            setBrowserBotFilter(no_bots)
        }
    }, [filteredSessions, browserBotToggle]);

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

    const handleChangePage = (event, newPageNum) => {
        setPageNum(newPageNum);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPageNum(0);
    };

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
        return order === "desc" 
            ? (a, b) => descendingComparator(a, b, orderBy)
            : (a, b) => -descendingComparator(a, b, orderBy);
    };

    const handleFilterToggle = (value) => {
        setTableFilters((prev) => 
            prev.includes(value) 
                ? prev.filter((val) => val !== value) // Removes value from filters list if it was in it
                : [...prev, value] // Adds value to filters list if it was not in it
        );
    }


    return (
        <Layout>
            {isLoggedIn ? (
                <div className="container rounded min-vh-100">
                    <div className="mx-3">
                        <div className="my-3 d-flex flex-row justify-content-center">
                            <h1>Session View Details</h1>
                        </div>
                        <div className="my-3 d-flex flex-row flex-wrap justify-content-center">
                            <h3 className="me-3">Showing session data from: </h3>
                            <Paper className="w-75" elevation={1}>
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
                        </div>
                        <div className="my-4 d-flex flex-row flex-wrap justify-content-around">
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Sessions by os")}>Sessions by os</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Sessions by browser")}>Sessions by browser</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Device breakdown")}>Device breakdown</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Dropoff point")}>Dropoff point</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Sessions table")}>Sessions table</button>
                        </div>
                        {dataView === "Sessions table" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-around flex-wrap">
                                <Paper elevation={2} component="form" className="p-1 my-3 w-50 d-flex align-items-center">
                                    <SearchIcon className="mx-2" />
                                    <InputBase 
                                        className="flex-grow-1"
                                        placeholder="Search sessions" 
                                        inputProps={{ 'aria-label': 'search sessions' }} 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                    />
                                </Paper>
                                <Paper className="my-3 d-flex justify-content-center rounded-5" elevation={2}>
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
                                <div className="my-3 d-flex flex-row justify-content-around">
                                    <CustomDatePicker 
                                        startDate={startDate} 
                                        setStartDate={setStartDate} 
                                        endDate={endDate} 
                                        setEndDate={setEndDate} 
                                        viewsList={['year', 'month', 'day']}
                                    />
                                </div>
                            </div>
                            <TableContainer component={Paper} elevation={3}>
                                <Table aria-label="Sessions table">
                                    <TableHead>
                                        <TableRow className="bg-info-subtle">
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "session_id"}
                                                    direction={orderBy === "session_id" ? order : "asc"}
                                                    onClick={() => handleTableSort("session_id")}
                                                >
                                                    Session ID
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">OS</TableCell>
                                            <TableCell align="center">Browser</TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "last_reached_seconds"}
                                                    direction={orderBy === "last_reached_seconds" ? order : "desc"}
                                                    onClick={() => handleTableSort("last_reached_seconds")}
                                                >
                                                    Last Reached Point
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">Mobile</TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "started_time_unix"}
                                                    direction={orderBy === "started_time_unix" ? order : "desc"}
                                                    onClick={() => handleTableSort("started_time_unix")}
                                                >
                                                    Started
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "ended_time_unix"}
                                                    direction={orderBy === "ended_time_unix" ? order : "desc"}
                                                    onClick={() => handleTableSort("ended_time_unix")}
                                                >
                                                    Ended
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">Timezone</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {[...filteredSessions].sort(getTableComparator(order, orderBy))
                                            .slice(pageNum*rowsPerPage, pageNum*rowsPerPage + rowsPerPage)
                                            .map((session) => (
                                            <TableRow key={session.session_id}>
                                                <TableCell className="border" align="center">
                                                    <button className="btn" onClick={() => {
                                                        if (searchQuery === "") {
                                                            setSearchQuery(session.session_id.toString());
                                                        } else {
                                                            setSearchQuery(searchQuery + " " + session.session_id.toString())
                                                        }
                                                    }}>
                                                        {session.session_id}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="border" align="center">{session.viewer_os}</TableCell>
                                                <TableCell className="border" align="center">{session.viewer_browser}</TableCell>
                                                <TableCell className="border" align="right">{session.last_reached_seconds?.toLocaleString()}s ({session.last_reached_percent}%)</TableCell>
                                                <TableCell className="border" align="center">{session.viewer_mobile ? "Y" : "N"}</TableCell>
                                                <TableCell className="border" align="center">{session.started_time_unix !== 0 ? session.started_at.format("YYYY-MM-DD") : "None"}</TableCell>
                                                <TableCell className="border" align="center">{session.ended_time_unix !== 0 ? session.ended_at.format("YYYY-MM-DD") : "None"}</TableCell>
                                                <TableCell className="border" align="center">{session.viewer_timezone || "None"}</TableCell>
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
                            <div className="d-flex flex-row justify-content-center my-3">
                                <div className="d-flex flex-row justify-content-around">
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setSessionByOsChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setSessionByOsChart("Bar")}>Bar Chart</button>
                                </div>
                                <div className="d-flex flex-row justify-content-around">
                                    <CustomDatePicker 
                                        startDate={startDate} 
                                        setStartDate={setStartDate} 
                                        endDate={endDate} 
                                        setEndDate={setEndDate} 
                                        viewsList={['year', 'month', 'day']}
                                    />
                                </div>
                            </div>
                            {sessionByOsChart ===  "Pie" &&
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
                            </div>
                        } {dataView === "Sessions by browser" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center my-3">
                                <FormControlLabel 
                                    control={
                                        <Checkbox 
                                            checked={browserBotToggle} 
                                            onChange={() => setBrowserBotToggle(!browserBotToggle)}
                                        />
                                    }
                                    label={"Exclude bots and scrapers"}
                                />
                                <div className="d-flex flex-row justify-content-around">
                                    <CustomDatePicker 
                                        startDate={startDate} 
                                        setStartDate={setStartDate} 
                                        endDate={endDate} 
                                        setEndDate={setEndDate} 
                                        viewsList={['year', 'month', 'day']}
                                    />
                                </div>
                            </div>
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
                            </div>
                        } {dataView === "Device breakdown" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center my-3">
                                <div className="d-flex flex-row justify-content-around">
                                    <CustomDatePicker 
                                        startDate={startDate} 
                                        setStartDate={setStartDate} 
                                        endDate={endDate} 
                                        setEndDate={setEndDate} 
                                        viewsList={['year', 'month', 'day']}
                                    />
                                </div>
                            </div>
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
                        } {dataView === "Dropoff point" &&
                            <LineChart 
                                xAxis={[{data:bucketArray.map((_, i) => `${i * bucketSize}s`), scaleType:'point', label:'Video time (seconds)'}]}
                                series={[{data:bucketArray, label:"# of sessions that stopped at this time", showMark:false, area:true, color:"#0dcaef"}]}
                                height={400}
                            />
                        }
                        
                    </div>
                </div>
            ) : (
                <p>You must be logged in to view this page.</p>
            )}
        </Layout>
    )
}

export default SessionsView;