import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import { useVideoFilter } from '../context/VideoFilterContext';
import { IconButton, Menu, MenuItem, Typography, Checkbox, FormControlLabel, Box, useControlled } from '@mui/material';
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import DataObjectIcon from '@mui/icons-material/DataObject';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import { Paper, InputBase, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel } from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import axiosInstance from "../components/AxiosInstance";

var isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

function Summary() {
    const [user, setUser] = useState(null);
    const [videoStats, setVideoStats] = useState([]);
    const { setVideoFilter } = useVideoFilter();
    const [aggrStats, setAggrStats] = useState({});
    const [filteredAggrStats, setFilteredAggrStats] = useState({});
    const [videoRatings, setVideoRatings] = useState([]);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("video.title");
    const [order, setOrder] = useState("asc");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilters, setStatusFilters] = useState([0, 1, 2, 3, 4]);
    const [anchorFilterMenu, setAnchorFilterMenu] = useState(null); // Anchors the place the filter menu appears in the DOM
    const filterMenuOpen = Boolean(anchorFilterMenu); // Filter menu is open when it is not null
    const [startDate, setStartDate] = useState(dayjs("2020-01-01"));
    const [endDate, setEndDate] = useState(dayjs());
    const statusFilterText = [
        "Only you",
        "Embed only",
        "Only with the link",
        "Anyone",
        "Only those specified"
    ]

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
    
    useEffect(() => {
        if (!user) return;

        if (user.benesse) {
            axiosInstance.get("videos/video_ratings/")
                .then((res) => {
                    setVideoRatings(res.data);
                })
        }
    }, [user]);

    useEffect(() => {
        axiosInstance.get("videos/stats/")
            .then(res => {
                const videoStatsData = res.data.map(video => ({ // Section that adds view_rate for table
                    ...video,
                    video: { // Set the nested field created_date to a dayjs object
                        ...video.video,
                        created_date: dayjs(video.video.created_date),
                    },
                    average_rating:videoRatings.find(rating => rating.video.video_id === video.video.video_id)?.average_rating || -1,
                    one_star:videoRatings.find(rating => rating.video.video_id === video.video.video_id)?.one_star || 0,
                    two_star:videoRatings.find(rating => rating.video.video_id === video.video.video_id)?.two_star || 0,
                    three_star:videoRatings.find(rating => rating.video.video_id === video.video.video_id)?.three_star || 0,
                    four_star:videoRatings.find(rating => rating.video.video_id === video.video.video_id)?.four_star || 0,
                    five_star:videoRatings.find(rating => rating.video.video_id === video.video.video_id)?.five_star || 0,
                    view_rate: video.total_views > 0
                    ? Math.round((video.started_views / video.total_views) * 100)
                    : 0 // Makes sure that there's no divide by 0 error
                }));

                setVideoStats(videoStatsData);

                const aggregated_stats = {
                    num_videos: videoStatsData.length,
                    total_views: 0,
                    started_views: 0,
                    finished_views: 0,
                    interaction_clicks: 0
                };

                videoStatsData.forEach(video => {
                    aggregated_stats.total_views += video.total_views;
                    aggregated_stats.started_views += video.started_views;
                    aggregated_stats.finished_views += video.finished_views;
                    aggregated_stats.interaction_clicks += video.interaction_clicks;
                });

                setAggrStats(aggregated_stats);
            })
            .catch(err => console.error(err));
    }, [videoRatings]);

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

    const getValueByPath = (obj, path) => { // Needed for nested paths in videoStats
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };
    
    const descendingComparator = (a, b, orderBy) => {
        const a_val = getValueByPath(a, orderBy);
        const b_val = getValueByPath(b, orderBy);

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

    const handleStatusFilterToggle = (value) => {
        setStatusFilters((prev) => 
            prev.includes(value) 
                ? prev.filter((val) => val !== value) // Removes value from filters list if it was in it
                : [...prev, value] // Adds value to filters list if it was not in it
        );
    }

    const filteredStats = useMemo(() => {
        const searchTerms = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(term =>
            term.replace(/"/g, "").toLowerCase()
        ) || []; // Creates a list of search terms from the query of all words or strings in quotes split by spaces

        return videoStats.filter((video) => {
            const id = video.video.video_id.toString();
            const title = video.video.title.toLowerCase();

            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => 
                title.includes(term) || id.includes(term)
            );

            const matchesDate = 
                video.video.created_date.isSameOrAfter(startDate.startOf("day")) && 
                video.video.created_date.isSameOrBefore(endDate.endOf("day"));

            const matchesStatus = statusFilters.includes(video.video.status);

            return matchesSearch && matchesDate && matchesStatus;
        });
    }, [videoStats, searchQuery, startDate, endDate, statusFilters]);

    useEffect(() => {
        const aggregated_stats = {
            num_videos: filteredStats.length,
            total_views: 0,
            started_views: 0,
            finished_views: 0,
            interaction_clicks: 0
        };

        filteredStats.forEach(video => {
            aggregated_stats.total_views += video.total_views;
            aggregated_stats.started_views += video.started_views;
            aggregated_stats.finished_views += video.finished_views;
            aggregated_stats.interaction_clicks += video.interaction_clicks;
        });

        setFilteredAggrStats(aggregated_stats);
    }, [filteredStats])

    const handleJsonExport = async (video_id) => {
        try {
            const response = await axiosInstance.get(`videos/export/${video_id}/`, {
            responseType: "blob",
        });
        // Sets up the link to download the json file, then goes to it and cleans up afterwards
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `video_id_${video_id}_at_${dayjs().format("YYYY-MM-DDTHH:mm:ssZ")}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        } catch (error) {
            console.error("Error downloading JSON file", error);
        }
    }

    return (
        <Layout>
            {user ? (
                <div className="container rounded min-vh-100">
                    <div className="mx-3 d-flex flex-column">
                        <div className="my-2 d-flex flex-row justify-content-center">
                            <h1>Video Statistics Summary</h1>
                        </div>
                        <div className="d-flex flex-row justify-content-around flex-wrap">
                            <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                <h3 className="text-secondary">Total Videos </h3>
                                <div className="d-flex flex-row justify-content-center">
                                    <h3 className="text-info">{filteredAggrStats.num_videos?.toLocaleString()}</h3>
                                    <h3 className="text-secondary">/{aggrStats.num_videos?.toLocaleString()}</h3>
                                </div>
                                <h3 className="text-info">{Number(((filteredAggrStats.num_videos / aggrStats.num_videos) * 100).toFixed(2)) || 0}%</h3>
                            </Paper>
                            <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                <h3 className="text-secondary">Total Views</h3>
                                <div className="d-flex flex-row justify-content-center">
                                    <h3 className="text-info">{filteredAggrStats.total_views?.toLocaleString()}</h3>
                                    <h3 className="text-secondary">/{aggrStats.total_views?.toLocaleString()}</h3>
                                </div>
                                <h3 className="text-info">{Number(((filteredAggrStats.total_views / aggrStats.total_views) * 100).toFixed(2)) || 0}%</h3>
                            </Paper>
                            <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                <h3 className="text-secondary">Started Views</h3>
                                <div className="d-flex flex-row justify-content-center">
                                    <h3 className="text-info">{filteredAggrStats.started_views?.toLocaleString()}</h3>
                                    <h3 className="text-secondary">/{aggrStats.started_views?.toLocaleString()}</h3>
                                </div>
                                <h3 className="text-info">{Number(((filteredAggrStats.started_views / aggrStats.started_views) * 100).toFixed(2)) || 0}%</h3>
                            </Paper>
                            <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                <h3 className="text-secondary">Finished Views</h3>
                                <div className="d-flex flex-row justify-content-center">
                                    <h3 className="text-info">{filteredAggrStats.finished_views?.toLocaleString()}</h3>
                                    <h3 className="text-secondary">/{aggrStats.finished_views?.toLocaleString()}</h3>
                                </div>
                                <h3 className="text-info">{Number(((filteredAggrStats.finished_views / aggrStats.finished_views) * 100).toFixed(2)) || 0}%</h3>
                            </Paper>
                            <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                <h3 className="text-secondary">Interaction Clicks</h3>
                                <div className="d-flex flex-row justify-content-center">
                                    <h3 className="text-info">{filteredAggrStats.interaction_clicks?.toLocaleString()}</h3>
                                    <h3 className="text-secondary">/{aggrStats.interaction_clicks?.toLocaleString()}</h3>
                                </div>
                                <h3 className="text-info">{Number(((filteredAggrStats.interaction_clicks / aggrStats.interaction_clicks) * 100).toFixed(2)) || 0}%</h3>
                            </Paper>
                        </div>
                        <hr style={{borderWidth: "3px"}} />

                        <div className="d-flex flex-row justify-content-around flex-wrap">
                            <Paper elevation={2} className="p-1 my-3 w-50 d-flex align-items-center">
                                <SearchIcon className="mx-2" />
                                <InputBase 
                                    className="flex-grow-1"
                                    placeholder="Search video stats" 
                                    inputProps={{ 'aria-label': 'search video stats' }} 
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
                                        <Typography variant="subtitle1">Status Filter Options</Typography>
                                    </MenuItem>
                                    <Box px={2} className="d-flex flex-column" gap={1}>
                                        {[0, 1, 2, 3, 4].map((filterOption) => (
                                            <FormControlLabel key={filterOption} 
                                                control={
                                                    <Checkbox 
                                                        checked={statusFilters.includes(filterOption)} 
                                                        onChange={() => handleStatusFilterToggle(filterOption)}
                                                    />
                                                }
                                                label={`${filterOption} (${statusFilterText[filterOption]})`}
                                            />
                                        ))}
                                    </Box>
                                </Menu>
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
                            <Table aria-label="Summary table">
                                <TableHead className="bg-info-subtle">
                                    <TableRow>
                                        <TableCell align="center">Video ID</TableCell>
                                        <TableCell align="center">
                                            <TableSortLabel 
                                                active={orderBy === "video.title"}
                                                direction={orderBy === "video.title" ? order : "asc"}
                                                onClick={() => {handleTableSort("video.title");}}
                                            >
                                                Video Title
                                            </TableSortLabel> 
                                        </TableCell>
                                        <TableCell align="center">
                                            <TableSortLabel 
                                                active={orderBy === "total_views"}
                                                direction={orderBy === "total_views" ? order : "desc"}
                                                onClick={() => handleTableSort("total_views")}
                                            >
                                                Total Views
                                            </TableSortLabel> 
                                        </TableCell>
                                        <TableCell align="center">
                                            <TableSortLabel 
                                                active={orderBy === "started_views"}
                                                direction={orderBy === "started_views" ? order : "desc"}
                                                onClick={() => handleTableSort("started_views")}
                                            >
                                                Started Views
                                            </TableSortLabel> 
                                        </TableCell>
                                        <TableCell align="center">
                                            <TableSortLabel 
                                                active={orderBy === "view_rate"}
                                                direction={orderBy === "view_rate" ? order : "desc"}
                                                onClick={() => handleTableSort("view_rate")}
                                            >
                                                View Rate
                                            </TableSortLabel> 
                                        </TableCell>
                                        <TableCell align="center">
                                            <TableSortLabel 
                                                active={orderBy === "interaction_clicks"}
                                                direction={orderBy === "interaction_clicks" ? order : "desc"}
                                                onClick={() => handleTableSort("interaction_clicks")}
                                            >
                                                Interaction Clicks
                                            </TableSortLabel> 
                                        </TableCell>
                                        {user?.benesse && 
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "average_rating"}
                                                    direction={orderBy === "average_rating" ? order : "desc"}
                                                    onClick={() => handleTableSort("average_rating")}
                                                >
                                                    Average Rating
                                                </TableSortLabel> 
                                            </TableCell>
                                        }
                                        <TableCell align="center">
                                            <Tooltip arrow title={<>0 = Only you<br/>1 = Embed only<br/>2 = Only those who know the link<br/>3 = Anyone<br/>4 = Only those specified</>} placement="top">
                                                Access Status
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">Hihaho Links</TableCell>
                                        <TableCell align="center">Details</TableCell>
                                        <TableCell align="center">
                                            <TableSortLabel 
                                                active={orderBy === "video.created_date"}
                                                direction={orderBy === "video.created_date" ? order : "desc"}
                                                onClick={() => handleTableSort("video.created_date")}
                                            >
                                                Date Created
                                            </TableSortLabel> 
                                        </TableCell>
                                        <TableCell align="center">JSON</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredStats.sort(getTableComparator(order, orderBy))
                                        .slice(pageNum*rowsPerPage, pageNum*rowsPerPage + rowsPerPage)
                                        .map(videoStat => (
                                        <TableRow key={videoStat.video.video_id}>
                                            <TableCell className="border" align="center">
                                                <button className="btn" onClick={() => {
                                                    if (searchQuery === "") {
                                                        setSearchQuery(videoStat.video.video_id.toString());
                                                    } else {
                                                        setSearchQuery(searchQuery + " " + videoStat.video.video_id.toString())
                                                    }
                                                }}>
                                                    {videoStat.video.video_id}
                                                </button>
                                            </TableCell>
                                            <TableCell className="border" align="center">
                                                <button className="btn" onClick={() => {
                                                    if (searchQuery === "") {
                                                        setSearchQuery("\"" + videoStat.video.title + "\"");
                                                    } else {
                                                        setSearchQuery(searchQuery + " \"" + videoStat.video.title + "\"")
                                                    }
                                                }}>
                                                    {videoStat.video.title}
                                                </button>
                                            </TableCell>
                                            <TableCell className="border" align="right">
                                                {videoStat.total_views?.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="border" align="right">
                                                {videoStat.started_views?.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="border" align="right">
                                                {videoStat.view_rate}%
                                            </TableCell>
                                            <TableCell className="border" align="right">
                                                {videoStat.interaction_clicks?.toLocaleString()}
                                            </TableCell>
                                            {user?.benesse && 
                                                <TableCell className="border" align="right">
                                                    {videoStat.average_rating !== -1 ? (
                                                        <Tooltip arrow title={<>★☆☆☆☆: {videoStat.one_star} times<br/>★★☆☆☆: {videoStat.two_star} times<br/>★★★☆☆: {videoStat.three_star} times<br/>★★★★☆: {videoStat.four_star} times<br/>★★★★★: {videoStat.five_star} times<br/></>} placement="right">
                                                            {Number(videoStat.average_rating).toFixed(2)}
                                                        </Tooltip>
                                                    ) : (
                                                        "N/A"
                                                    )}
                                                </TableCell>
                                            }
                                            <TableCell className="border" align="right">{videoStat.video.status}</TableCell>
                                            <TableCell className="border" align="center">
                                                <Tooltip arrow title="Preview video" placement="right-end">
                                                    <Link to={`https://player.hihaho.com/${videoStat.video.uuid}`} target="_blank"><IconButton><VisibilityIcon/></IconButton></Link>
                                                </Tooltip>
                                                <Tooltip arrow title="See video statistics" placement="right-end">
                                                    <Link to={`https://studio.hihaho.com/stats/${videoStat.video.uuid}`} target="_blank"><IconButton><BarChartIcon/></IconButton></Link>
                                                </Tooltip>
                                                <Tooltip arrow title="Edit video" placement="right-end">
                                                    <Link to={`https://studio.hihaho.com/enrich/${videoStat.video.uuid}`} target="_blank"><IconButton><EditNoteIcon/></IconButton></Link>
                                                </Tooltip>                                                
                                            </TableCell>
                                            <TableCell className="border" align="center">
                                                <Tooltip arrow title="See interaction details" placement="right-end">
                                                    <Link to="/interactions/" onClick={() => setVideoFilter(videoStat.video.video_id)}><IconButton><AdsClickIcon/></IconButton></Link>
                                                </Tooltip>
                                                <Tooltip arrow title="See monthly view details" placement="right-end">
                                                    <Link to="/monthlyview/" onClick={() => setVideoFilter(videoStat.video.video_id)}><IconButton><SsidChartIcon/></IconButton></Link>
                                                </Tooltip>
                                                <Tooltip arrow title="See session view details" placement="right-end">
                                                    <Link to="/sessionsview/" onClick={() => setVideoFilter(videoStat.video.video_id)}><IconButton><SlideshowIcon/></IconButton></Link>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="border" align="center">{videoStat.video.created_date.format("MMM D, YYYY")}</TableCell>
                                            <TableCell className="border" align="center"><IconButton onClick={() => handleJsonExport(videoStat.video.video_id)}><DataObjectIcon /></IconButton></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={filteredStats.length}
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
                </div>
            ) : (
                <p>You must be logged in to view this page.</p>
            )}
        </Layout>
    )
}

export default Summary