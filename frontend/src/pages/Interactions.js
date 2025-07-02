import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { useVideoFilter } from "../context/VideoFilterContext";
import { BarChart, LineChart, PieChart } from '@mui/x-charts';
import Select from 'react-select';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel } from "@mui/material";
import { Paper, InputBase } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SearchIcon from '@mui/icons-material/Search';
import dayjs from "dayjs";
import axiosInstance from "../components/AxiosInstance";

var isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

function Interactions() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [videos, setVideos] = useState([]);
    const [interactions, setInteractions] = useState([]);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [bucketSize, setBucketSize] = useState(1);
    const [bucketArray, setBucketArray] = useState([]);
    const [durationBound, setDurationBound] = useState(20); // Max allowed duration of interaction in line graph
    const [dataView, setDataView] = useState("Clicks per type bar graph");
    const [clicksPerTypeChart, setClicksPerTypeChart] = useState("Bar");
    const [clicksPerActionTypeChart, setClicksPerActionTypeChart] = useState("Pie");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("title");
    const [order, setOrder] = useState("asc");
    const [searchQuery, setSearchQuery] = useState("");
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

                if (!videoFilter) {
                    setVideoFilter(videoList[0].video_id);
                }
            })
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!videoFilter) return; // Ignore any attempts to call this before videoFilter is set

        axiosInstance.get(`videos/${videoFilter}/interactions/`)
            .then(res => {
                const interactionsData = res.data.map(interaction => ({
                    ...interaction,
                    created_at: dayjs(interaction.created_at)
                }));
                setInteractions(interactionsData);
                setPageNum(0);

                // Get the video duration and prepare the line chart data only after interactions is fetched
                if (videoFilter) {
                axiosInstance.get(`videos/${videoFilter}/stats/`)
                    .then(res => {
                        const bucketSizeSeconds = Math.max(1, Math.round((res.data[0].video_duration_seconds * 0.05)*100/100));
                        const bucketItems = new Array(Math.ceil(res.data[0].video_duration_seconds / bucketSizeSeconds)).fill(0);

                        const shortInteractions = interactionsData.filter(interaction => {
                            return interaction.duration_seconds <= durationBound}
                        );
                        shortInteractions.forEach(interaction => {
                            const bucketIndex = Math.floor(interaction.start_time_seconds / bucketSizeSeconds);
                            if (bucketIndex >= 0 && bucketIndex < bucketItems.length) {
                                bucketItems[bucketIndex] += interaction.total_clicks;
                            } else {
                                console.error(
                                    `Skipping interaction with start_time_seconds ${interaction.start_time_seconds}, `
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
    }, [videoFilter, durationBound])

    const handleSelectVideoFilterChange = (selectOption) => {
        setVideoFilter(selectOption.value);
    }

    const filteredInteractions = useMemo(() => {
        const searchTerms = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(term =>
            term.replace(/"/g, "").toLowerCase()
        ) || []; // Creates a list of search terms from the query of all words or strings in quotes split by spaces

        return interactions.filter((interaction) => {
            const id = interaction.interaction_id.toString();
            const title = interaction.title.toLowerCase();
            const type = interaction.type.toLowerCase();
            const action_type = interaction.action_type.toLowerCase();

            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => 
                id.includes(term) || title.includes(term) || type.includes(term) || action_type.includes(term)
            );

            const matchesDate = 
                interaction.created_at.isSameOrAfter(startDate.startOf("day")) && 
                interaction.created_at.isSameOrBefore(endDate.endOf("day"));

            return matchesSearch && matchesDate;
        });
    }, [interactions, searchQuery, startDate, endDate]);

    const interactionClicksByType = filteredInteractions.reduce((clicks, interaction) => {
        const key = interaction.type;
        if (!clicks[key]) {
            clicks[key] = 0;
        }
        clicks[key] += interaction.total_clicks;
        return clicks
    }, {});

    const iTypeBarChartData = Object.entries(interactionClicksByType).map(([type, total_clicks]) => ({
        type,
        total_clicks,
    }));

    const iTypePiePercentData = iTypeBarChartData.reduce((sum, grouping) => sum += grouping.total_clicks, 0)

    const iTypePieChartData = iTypeBarChartData.map((grouping, index) => {
        const percent = ((grouping.total_clicks/iTypePiePercentData) * 100).toFixed(1);
        return {id:index, value:grouping.total_clicks, label:`${grouping.type}: ${percent}%`};
    })

    const interactionClicksByActionType = filteredInteractions.reduce((clicks, interaction) => {
        let key = interaction.action_type;
        if (interaction.action_type === "No action type selected") {
            key = "Other";
        } else if (interaction.action_type === "Jump to specific time in video") {
            key = "Jump to time";
        } else if (interaction.action_type === "Jump to start of video") {
            key = "Jump to start";
        }

        if (!clicks[key]) {
            clicks[key] = 0;
        }
        clicks[key] += interaction.total_clicks;
        return clicks
    }, {});

    const iActionTypeBarChartData = Object.entries(interactionClicksByActionType).map(([action_type, total_clicks]) => ({
        action_type,
        total_clicks,
    })).sort((a, b) => b.total_clicks - a.total_clicks);

    const iActionTypePiePercentData = iActionTypeBarChartData.reduce((sum, grouping) => sum += grouping.total_clicks, 0)

    const iActionTypePieChartData = iActionTypeBarChartData.map((grouping, index) => {
        const percent = ((grouping.total_clicks/iActionTypePiePercentData) * 100).toFixed(1);
        return {id:index, value:grouping.total_clicks, label:`${grouping.action_type}: ${percent}%`};
    })

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


    return (
        <Layout>
            {isLoggedIn ? (
                <div className="container rounded min-vh-100">
                    <div className="mx-3">
                        <div className="my-3 d-flex flex-row justify-content-center">
                            <h1>Interaction Insights</h1>
                        </div>
                        <div className="my-3 d-flex flex-row flex-wrap justify-content-center">
                            <h3 className="me-3">Showing interactions from: </h3>
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
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Clicks per type bar graph")}>Clicks per type</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Clicks per action type bar graph")}>Clicks per action type</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Clicks by video duration line graph")}>Clicks by video time</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Interaction table")}>Interaction Data</button>
                        </div>
                        {dataView === "Interaction table" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-around flex-wrap">
                                <Paper elevation={2} component="form" className="p-1 my-3 w-50 d-flex align-items-center">
                                    <SearchIcon className="mx-2" />
                                    <InputBase 
                                        className="flex-grow-1"
                                        placeholder="Search interactions" 
                                        inputProps={{ 'aria-label': 'search interactions' }} 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                    />
                                </Paper>
                                <div className="my-3 d-flex flex-row justify-content-around">
                                    <DatePicker className="mx-1 shadow-sm" label="Start date" 
                                        value={startDate} 
                                        onChange={date => setStartDate(date)} 
                                        disableFuture
                                        minDate={dayjs('2000-01-01')}
                                        maxDate={endDate}
                                    />
                                    <DatePicker className="mx-1 shadow-sm" label="End date" 
                                        value={endDate} 
                                        onChange={date => setEndDate(date)} 
                                        disableFuture
                                        minDate={startDate}
                                        maxDate={dayjs()}
                                    />
                                </div>
                            </div>
                            <TableContainer component={Paper} elevation={3}>
                                <Table aria-label="Interactions table">
                                    <TableHead>
                                        <TableRow className="bg-info-subtle">
                                            <TableCell align="center">Interaction ID</TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "title"}
                                                    direction={orderBy === "title" ? order : "asc"}
                                                    onClick={() => handleTableSort("title")}
                                                >
                                                    Title
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">Type</TableCell>
                                            <TableCell align="center">Action Type</TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "start_time_seconds"}
                                                    direction={orderBy === "start_time_seconds" ? order : "desc"}
                                                    onClick={() => handleTableSort("start_time_seconds")}
                                                >
                                                    Start
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "end_time_seconds"}
                                                    direction={orderBy === "end_time_seconds" ? order : "desc"}
                                                    onClick={() => handleTableSort("end_time_seconds")}
                                                >
                                                    End
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "duration_seconds"}
                                                    direction={orderBy === "duration_seconds" ? order : "desc"}
                                                    onClick={() => handleTableSort("duration_seconds")}
                                                >
                                                    Duration
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">Link</TableCell>
                                            <TableCell align="center"> 
                                                <TableSortLabel 
                                                    active={orderBy === "total_clicks"}
                                                    direction={orderBy === "total_clicks" ? order : "desc"}
                                                    onClick={() => handleTableSort("total_clicks")}
                                                >
                                                    Clicks
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center"> 
                                                <TableSortLabel 
                                                    active={orderBy === "created_at"}
                                                    direction={orderBy === "created_at" ? order : "desc"}
                                                    onClick={() => handleTableSort("created_at")}
                                                >
                                                    Date created
                                                </TableSortLabel> 
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {[...filteredInteractions].sort(getTableComparator(order, orderBy))
                                            .slice(pageNum*rowsPerPage, pageNum*rowsPerPage + rowsPerPage)
                                            .map((interaction) => (
                                            <TableRow key={interaction.interaction_id}>
                                                <TableCell className="border" align="center">
                                                    <button className="btn" onClick={() => {
                                                        if (searchQuery === "") {
                                                            setSearchQuery(interaction.interaction_id.toString());
                                                        } else {
                                                            setSearchQuery(searchQuery + " " + interaction.interaction_id.toString())
                                                        }
                                                    }}>
                                                        {interaction.interaction_id}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="border" align="center">
                                                    <button className="btn" onClick={() => {
                                                        if (searchQuery === "") {
                                                            setSearchQuery("\"" + interaction.title + "\"");
                                                        } else {
                                                            setSearchQuery(searchQuery + " \"" + interaction.title + "\"")
                                                        }
                                                    }}>
                                                        {interaction.title}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="border" align="center">{interaction.type}</TableCell>
                                                <TableCell className="border" align="center">{interaction.action_type}</TableCell>
                                                <TableCell className="border" align="right">
                                                    {(Math.round(interaction.start_time_seconds * 100) / 100)?.toLocaleString()}s
                                                </TableCell>
                                                <TableCell className="border" align="right">
                                                    {(Math.round(interaction.end_time_seconds * 100) / 100)?.toLocaleString()}s
                                                </TableCell>
                                                <TableCell className="border" align="right">
                                                    {(Math.round(interaction.duration_seconds * 100) / 100)?.toLocaleString()}s
                                                </TableCell>
                                                <TableCell className="border" align="center">{interaction.link ? <a href={interaction.link}>{interaction.link}</a> : "None"}</TableCell>
                                                <TableCell className="border" align="right">
                                                    {interaction.total_clicks?.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="border">{interaction.created_at.format("YYYY-MM-DD HH:mm")}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={filteredInteractions.length}
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
                        } {dataView === "Clicks per type bar graph" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center my-3">
                                <div className="d-flex flex-row justify-content-around">
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setClicksPerTypeChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setClicksPerTypeChart("Bar")}>Bar Chart</button>
                                </div>
                                <div className="d-flex flex-row justify-content-around">
                                    <DatePicker className="mx-1 shadow-sm" label="Start date" 
                                        value={startDate} 
                                        onChange={date => setStartDate(date)} 
                                        disableFuture
                                        minDate={dayjs('2000-01-01')}
                                        maxDate={endDate}
                                    />
                                    <DatePicker className="mx-1 shadow-sm" label="End date" 
                                        value={endDate} 
                                        onChange={date => setEndDate(date)} 
                                        disableFuture
                                        minDate={startDate}
                                        maxDate={dayjs()}
                                    />
                                </div>
                            </div>
                            {clicksPerTypeChart === "Pie" &&
                                <PieChart
                                    colors={piePallette}
                                    series={[{
                                        arcLabel:(grouping) => `${grouping.label} (${grouping.value})`,
                                        data: iTypePieChartData,
                                        arcLabelMinAngle:35
                                    }]}
                                    width={800}
                                    height={400}
                                />
                            } {clicksPerTypeChart === "Bar" &&
                                <BarChart 
                                    xAxis={[{label:"Interaction type", data: iTypeBarChartData.map(grouping => grouping.type)}]}
                                    yAxis={[{label:"Total clicks", width:60}]}
                                    series={[{label:"Total clicks per interaction type", data: iTypeBarChartData.map(grouping => grouping.total_clicks), color:"#0dcaef"}]}
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
                        } {dataView === "Clicks per action type bar graph" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center my-3">
                                <div className="d-flex flex-row justify-content-around">
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setClicksPerActionTypeChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setClicksPerActionTypeChart("Bar")}>Bar Chart</button>
                                </div>
                                <div className="d-flex flex-row justify-content-around">
                                    <DatePicker className="mx-1 shadow-sm" label="Start date" 
                                        value={startDate} 
                                        onChange={date => setStartDate(date)} 
                                        disableFuture
                                        minDate={dayjs('2000-01-01')}
                                        maxDate={endDate}
                                    />
                                    <DatePicker className="mx-1 shadow-sm" label="End date" 
                                        value={endDate} 
                                        onChange={date => setEndDate(date)} 
                                        disableFuture
                                        minDate={startDate}
                                        maxDate={dayjs()}
                                    />
                                </div>
                            </div>
                            <h6 className="text-center">Total clicks per interaction action type</h6>
                            {clicksPerActionTypeChart === "Pie" &&
                                <PieChart
                                    colors={piePallette}
                                    series={[{
                                        arcLabel:(grouping) => `${grouping.label} (${grouping.value})`,
                                        data: iActionTypePieChartData,
                                        arcLabelMinAngle:35
                                    }]}
                                    width={800}
                                    height={400}
                                />
                            } {clicksPerActionTypeChart === "Bar" &&
                                <BarChart 
                                    xAxis={[{label:"Action type", data: iActionTypeBarChartData.map(grouping => grouping.action_type)}]}
                                    yAxis={[{label:"Total clicks", width:60}]}
                                    series={[{label:"Total clicks per interaction action type", data: iActionTypeBarChartData.map(grouping => grouping.total_clicks), color:"#0dcaef"}]}
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
                            }
                            </div>
                        } {dataView === "Clicks by video duration line graph" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center my-3">
                                <label className="my-auto">Only include interactions shorter than:</label>
                                <div class="dropdown">
                                    <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" 
                                        >{durationBound}s
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><button className="dropdown-item" value={10} onClick={(e) => setDurationBound(e.target.value)}>10s</button></li>
                                        <li><button className="dropdown-item" value={20} onClick={(e) => setDurationBound(e.target.value)}>20s</button></li>
                                        <li><button className="dropdown-item" value={50} onClick={(e) => setDurationBound(e.target.value)}>50s</button></li>
                                        <li><button className="dropdown-item" value={100} onClick={(e) => setDurationBound(e.target.value)}>100s</button></li>
                                    </ul>
                                </div>
                            </div>
                            <LineChart 
                                xAxis={[{data:bucketArray.map((_, i) => `${i * bucketSize}s`), scaleType:'point', label:'Video time (seconds)'}]}
                                series={[{data:bucketArray, label:"clicks", showMark:false, area:true, color:"#0dcaef"}]}
                                height={400}
                            />
                            </div>
                        }
                        
                    </div>
                </div>
            ) : (
                <p>You must be logged in to view this page.</p>
            )}
        </Layout>
    )
}

export default Interactions;