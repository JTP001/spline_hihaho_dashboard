import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { Link, useLocation } from "react-router-dom";
import { useVideoFilter } from '../context/VideoFilterContext';
import { IconButton, Menu, MenuItem, Typography, Checkbox, FormControlLabel, Box } from '@mui/material';
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import DataObjectIcon from '@mui/icons-material/DataObject';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import { Paper, InputBase, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import SearchIcon from '@mui/icons-material/Search';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel } from "@mui/material";
import { BarChart, PieChart } from '@mui/x-charts';
import { ThreeDots } from 'react-loading-icons';
import dayjs from "dayjs";
import axiosInstance from "../components/AxiosInstance";
import CustomDatePicker from "../components/CustomDatePicker";

var isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

function Summary() {
    const [user, setUser] = useState(null);
    const [videoStats, setVideoStats] = useState([]);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [aggrStats, setAggrStats] = useState({});
    const [filteredAggrStats, setFilteredAggrStats] = useState({});
    const [videoRatings, setVideoRatings] = useState([]);
    const [allInteractions, setAllInteractions] = useState([]);
    const [allQuestions, setAllQuestions] = useState([]);
    const [allPastTwoMonths, setAllPastTwoMonths] = useState({});
    const [dataView, setDataView] = useState("Summary table");
    const [interactionsPerTypeChart, setInteractionsPerTypeChart] = useState("Bar");
    const [questionsPerTypeChart, setQuestionsPerTypeChart] = useState("Bar");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("video.title");
    const [order, setOrder] = useState("asc");
    const [searchQuery, setSearchQuery] = useState("");
    const [folderFilters, setFolderFilters] = useState([]);
    const [folderFilterMenuOptions, setFolderFilterMenuOptions] = useState([])
    const [anchorFolderFilterMenu, setAnchorFolderFilterMenu] = useState(null); // Anchors the place the filter menu appears in the DOM
    const folderFilterMenuOpen = Boolean(anchorFolderFilterMenu); // Filter menu is open when it is not null
    const [statusFilters, setStatusFilters] = useState([0, 1, 2, 3, 4]);
    const [anchorFilterMenu, setAnchorFilterMenu] = useState(null); // Anchors the place the filter menu appears in the DOM
    const filterMenuOpen = Boolean(anchorFilterMenu); // Filter menu is open when it is not null
    const [startDate, setStartDate] = useState(dayjs("2020-01-01"));
    const [endDate, setEndDate] = useState(dayjs());
    const location = useLocation();
    const videoIdFromOtherPageFlag = location.state?.videoIdFromOtherPageFlag || false; // Default to false if undefined
    const piePallette = ["#0dcaef", "sandybrown", "lightgreen", "tomato", "mediumorchid", "khaki", "lightpink", "chocolate", "darksalmon", "aquamarine", "bisque", "green", "purple", "orange", "brown", "darkcyan"];
    const statusFilterText = [
        "Only you",
        "Embed only",
        "Only with the link",
        "Anyone",
        "Only those specified"
    ]

    //----------------------------------Check logged in----------------------------------//
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
                    await axiosInstance.get("user/", config)
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
    
    //------------------------------------Get video ratings------------------------------------//
    useEffect(() => {
        if (!user) return;

        if (user.benesse) {
            axiosInstance.get("videos/video_ratings/")
                .then((res) => {
                    setVideoRatings(res.data);
                })
        }
    }, [user]);

    //----------------------------Get video stats and aggregate----------------------------//
    useEffect(() => {
        axiosInstance.get("videos/stats/")
            .then(res => {
                const videoStatsData = res.data.map(videoStat => {
                    const video_id = videoStat.video.video_id;
                    const viewHistory = allPastTwoMonths[String(video_id)] || [0, 0];
                    const [lastMonthViews, twoMonthsAgoViews] = viewHistory;

                    let viewChangePercent = 0;
                    if (twoMonthsAgoViews === 0 && lastMonthViews > 0) {
                        viewChangePercent = 100; // Video was created last month
                    } else if (twoMonthsAgoViews === 0 && lastMonthViews === 0) {
                        viewChangePercent = 0; // Video was created this month (no past two month data)
                    } else {
                        viewChangePercent = ((lastMonthViews - twoMonthsAgoViews) / twoMonthsAgoViews) * 100;
                    }

                    return {
                        ...videoStat,
                        video: {
                            ...videoStat.video,
                            created_date: dayjs(videoStat.video.created_date),
                        },
                        average_rating: videoRatings.find(r => r.video.video_id === video_id)?.average_rating || -1,
                        one_star: videoRatings.find(r => r.video.video_id === video_id)?.one_star || 0,
                        two_star: videoRatings.find(r => r.video.video_id === video_id)?.two_star || 0,
                        three_star: videoRatings.find(r => r.video.video_id === video_id)?.three_star || 0,
                        four_star: videoRatings.find(r => r.video.video_id === video_id)?.four_star || 0,
                        five_star: videoRatings.find(r => r.video.video_id === video_id)?.five_star || 0,
                        view_change_percent: Math.round(viewChangePercent * 100) / 100,
                        view_rate: videoStat.total_views > 0
                            ? Math.round((videoStat.started_views / videoStat.total_views) * 100)
                            : 0
                    };
                });

                setVideoStats(videoStatsData);

                const aggregated_stats = {
                    num_videos: videoStatsData.length,
                    total_views: 0,
                    started_views: 0,
                    finished_views: 0,
                    interaction_clicks: 0
                };

                const uniqueFolders = new Set();
                videoStatsData.forEach(videoStat => {
                    aggregated_stats.total_views += videoStat.total_views;
                    aggregated_stats.started_views += videoStat.started_views;
                    aggregated_stats.finished_views += videoStat.finished_views;
                    aggregated_stats.interaction_clicks += videoStat.interaction_clicks;

                    uniqueFolders.add(`${videoStat.video.folder_name} (${videoStat.video.folder_number})`)
                });

                setFolderFilterMenuOptions([...uniqueFolders])
                setAggrStats(aggregated_stats);
            })
            .catch(err => console.error(err));
    }, [videoRatings, allPastTwoMonths]);
    
    //----------------------------------Handle filtering----------------------------------//
    const filteredStats = useMemo(() => {
        const searchTerms = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(term =>
            term.replace(/"/g, "").toLowerCase()
        ) || []; // Creates a list of search terms from the query of all words or strings in quotes split by spaces

        return videoStats.filter((videoStat) => {
            const id = videoStat.video.video_id.toString();
            const title = videoStat.video.title.toLowerCase();

            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => 
                title.includes(term) || id.includes(term)
            );

            const matchesDate = 
                videoStat.video.created_date.isSameOrAfter(startDate.startOf("day")) && 
                videoStat.video.created_date.isSameOrBefore(endDate.endOf("day"));

            const matchesFolders = !folderFilters.includes(`${videoStat.video.folder_name} (${videoStat.video.folder_number})`)
            const matchesStatus = statusFilters.includes(videoStat.video.status);

            return matchesSearch && matchesDate && matchesFolders && matchesStatus;
        });
    }, [videoStats, searchQuery, startDate, endDate, folderFilters, statusFilters]);

    //------------------------------Filter aggregated stats------------------------------//
    useEffect(() => {
        const aggregated_stats = {
            num_videos: filteredStats.length,
            total_views: 0,
            started_views: 0,
            finished_views: 0,
            interaction_clicks: 0
        };

        filteredStats.forEach(videoStat => {
            aggregated_stats.total_views += (videoStat.total_views ?? 0);
            aggregated_stats.started_views += (videoStat.started_views ?? 0);
            aggregated_stats.finished_views += (videoStat.finished_views ?? 0);
            aggregated_stats.interaction_clicks += (videoStat.interaction_clicks ?? 0);
        });

        setFilteredAggrStats(aggregated_stats);
    }, [filteredStats])

    //-------------------------Get all interactions and questions-------------------------//
    useEffect(() => {
        axiosInstance.get("videos/interactions/")
            .then(res => {
                const interactionsData = res.data.results.map(interaction => ({
                    ...interaction,
                    created_at: dayjs(interaction.created_at)
                }));
                setAllInteractions(interactionsData);
            })
            .catch(err => console.error(err));

        axiosInstance.get("videos/questions/")
            .then(res => {
                const questionsData = res.data.results.map(question => ({
                    ...question,
                    title:(question.title.slice(0, 18) === "<!--TINYMCE-->\n<p>") ? 
                        question.title.slice(18, -4) : 
                            (question.title.slice(0, 14) === "<!--TINYMCE-->") ? 
                            question.title.slice(15) : question.title,
                    percent_correct:question.total_answered > 0
                        ? Math.round((question.total_correctly_answered / question.total_answered) * 100)
                        : 0, // Makes sure that there's no divide by 0 error
                    created_at:dayjs(question.created_at)
                }));
                setAllQuestions(questionsData);
            })
            .catch(err => console.error(err));
    }, []);

    //-------------------------Get all past two month data-------------------------//
    useEffect(() => {
        axiosInstance.get("videos/monthly_views/past_two_months/")
            .then(res => {
                setAllPastTwoMonths(res.data);
            })
            .catch(err => console.error(err));
    }, [])

    //----------------------Handle filter from other page navigation----------------------//
    useEffect(() => {
        if (videoIdFromOtherPageFlag && videoFilter !== null) {
            setSearchQuery(String(videoFilter));
        }
    }, [videoIdFromOtherPageFlag, videoFilter])

    //----------------------Create 'interactions by type' chart data----------------------//
    const filteredVideoIds = new Set(filteredStats.map(stat => stat.video.video_id));

    const interactionCountByType = allInteractions.filter(interaction => filteredVideoIds.has(interaction.video.video_id))
        .reduce((total, interaction) => {
            const type = interaction.type;
            if (!total[type]) {
                total[type] = 0;
            }
            total[type] += 1;
            return total
    }, {});

    const itypeCountBarChartData = Object.entries(interactionCountByType).map(([type, total_interactions]) => ({
        type,
        total_interactions,
    })).sort((a, b) => b.total_interactions - a.total_interactions);;

    const itypeCountPiePercentData = itypeCountBarChartData.reduce((sum, grouping) => sum += grouping.total_interactions, 1)

    const itypeCountPieChartData = itypeCountBarChartData.map((grouping, index) => {
        const percent = ((grouping.total_interactions/itypeCountPiePercentData) * 100).toFixed(1);
        return {id:index, value:grouping.total_interactions, label:`${grouping.type}: ${percent}%`};
    })

    //----------------------Create 'questions by type' chart data----------------------//
    const questionCountByType = allQuestions.filter(question => filteredVideoIds.has(question.video.video_id))
        .reduce((total, question) => {
            const type = question.type;
            if (!total[type]) {
                total[type] = 0;
            }
            total[type] += 1;
            return total
    }, {});

    const qtypeCountBarChartData = Object.entries(questionCountByType).map(([type, total_questions]) => ({
        type,
        total_questions,
    })).sort((a, b) => b.total_questions - a.total_questions);;

    const qtypeCountPiePercentData = qtypeCountBarChartData.reduce((sum, grouping) => sum += grouping.total_questions, 1)

    const qtypeCountPieChartData = qtypeCountBarChartData.map((grouping, index) => {
        const percent = ((grouping.total_questions/qtypeCountPiePercentData) * 100).toFixed(1);
        return {id:index, value:grouping.total_questions, label:`${grouping.type}: ${percent}%`};
    })

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

    //---------------------------------Handle table filter---------------------------------//
    const handleFolderFilterToggle = (value) => {
        setFolderFilters((prev) => 
            prev.includes(value) 
                ? prev.filter((val) => val !== value) // Removes value from filters list if it was in it
                : [...prev, value] // Adds value to filters list if it was not in it
        );
    }

    const handleStatusFilterToggle = (value) => {
        setStatusFilters((prev) => 
            prev.includes(value) 
                ? prev.filter((val) => val !== value) // Removes value from filters list if it was in it
                : [...prev, value] // Adds value to filters list if it was not in it
        );
    }

    //---------------------------------Handle JSON export---------------------------------//
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

    //-------------------------------Rendered page elements-------------------------------//
    return (
        <Layout>
            {user ? (
                <div className="container rounded min-vh-100">
                    <div className="mx-3 d-flex flex-column">
                        <div className="my-2 d-flex flex-row justify-content-center">
                            <h1>Video Statistics Summary</h1>
                        </div>
                        <div className="my-2 d-flex flex-row flex-wrap justify-content-around">
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Summary table")}>Summary table</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Interaction graphs")}>Interaction graphs</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Question graphs")}>Question graphs</button>
                        </div>
                        {dataView === "Summary table" &&
                            <div className="d-flex flex-column">
                            <hr style={{borderWidth: "3px"}} />
                            <div className="d-flex flex-row justify-content-around flex-wrap">
                                <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                    <h3 className="text-secondary">Total Videos </h3>
                                    {filteredAggrStats.num_videos ? (
                                    <>
                                    <div className="d-flex flex-row justify-content-center">
                                        <h3 className="text-info">{filteredAggrStats.num_videos?.toLocaleString()}</h3>
                                        <h3 className="text-secondary">/{aggrStats.num_videos?.toLocaleString()}</h3>
                                    </div>
                                    <h3 className="text-info">{Number(((filteredAggrStats.num_videos / aggrStats.num_videos) * 100).toFixed(2)) || 0}%</h3>
                                    </>
                                    ) : (<ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={50}/>)}
                                </Paper>
                                <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                    <h3 className="text-secondary">Total Views </h3>
                                    {filteredAggrStats.num_videos ? (
                                    <>
                                    <div className="d-flex flex-row justify-content-center">
                                        <h3 className="text-info">{filteredAggrStats.total_views?.toLocaleString()}</h3>
                                        <h3 className="text-secondary">/{aggrStats.total_views?.toLocaleString()}</h3>
                                    </div>
                                    <h3 className="text-info">{Number(((filteredAggrStats.total_views / aggrStats.total_views) * 100).toFixed(2)) || 0}%</h3>
                                    </>
                                    ) : (<ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={50}/>)}
                                </Paper>
                                <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                    <h3 className="text-secondary">Started Views </h3>
                                    {filteredAggrStats.num_videos ? (
                                    <>
                                    <div className="d-flex flex-row justify-content-center">
                                        <h3 className="text-info">{filteredAggrStats.started_views?.toLocaleString()}</h3>
                                        <h3 className="text-secondary">/{aggrStats.started_views?.toLocaleString()}</h3>
                                    </div>
                                    <h3 className="text-info">{Number(((filteredAggrStats.started_views / aggrStats.started_views) * 100).toFixed(2)) || 0}%</h3>
                                    </>
                                    ) : (<ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={50}/>)}
                                </Paper>
                                <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                    <h3 className="text-secondary">Finished Views </h3>
                                    {filteredAggrStats.num_videos ? (
                                    <>
                                    <div className="d-flex flex-row justify-content-center">
                                        <h3 className="text-info">{filteredAggrStats.finished_views?.toLocaleString()}</h3>
                                        <h3 className="text-secondary">/{aggrStats.finished_views?.toLocaleString()}</h3>
                                    </div>
                                    <h3 className="text-info">{Number(((filteredAggrStats.finished_views / aggrStats.finished_views) * 100).toFixed(2)) || 0}%</h3>
                                    </>
                                    ) : (<ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={50}/>)}
                                </Paper>
                                <Paper className="my-2 d-flex flex-column text-center rounded-5 p-2" elevation={2}>
                                    <h3 className="text-secondary">Interaction Clicks </h3>
                                    {filteredAggrStats.num_videos ? (
                                    <>
                                    <div className="d-flex flex-row justify-content-center">
                                        <h3 className="text-info">{filteredAggrStats.interaction_clicks?.toLocaleString()}</h3>
                                        <h3 className="text-secondary">/{aggrStats.interaction_clicks?.toLocaleString()}</h3>
                                    </div>
                                    <h3 className="text-info">{Number(((filteredAggrStats.interaction_clicks / aggrStats.interaction_clicks) * 100).toFixed(2)) || 0}%</h3>
                                    </>
                                    ) : (<ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={50}/>)}
                                </Paper>
                            </div>

                            <div className="d-flex flex-row justify-content-around flex-wrap align-items-center">
                                <Paper elevation={2} className="p-2 w-50 d-flex align-items-center">
                                    <SearchIcon className="mx-2" />
                                    <InputBase 
                                        className="flex-grow-1"
                                        placeholder="Search video stats" 
                                        inputProps={{ 'aria-label': 'search video stats' }} 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </Paper>
                                <Paper className="my-3 mx-2 d-flex justify-content-center rounded-5" elevation={2}>
                                    <IconButton onClick={(e) => setAnchorFolderFilterMenu(anchorFolderFilterMenu ? null : e.currentTarget)}>
                                        <FilterListIcon />
                                    </IconButton>
                                    <Menu anchorEl={anchorFolderFilterMenu} open={folderFilterMenuOpen} onClose={() => setAnchorFolderFilterMenu(null)}>
                                        <MenuItem disabled>
                                            <Typography variant="subtitle1">Folder Filter Options</Typography>
                                        </MenuItem>
                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                            {folderFilterMenuOptions.map((filterOption) => (
                                                <FormControlLabel key={filterOption} 
                                                    control={
                                                        <Checkbox 
                                                            checked={!folderFilters.includes(filterOption)} 
                                                            onChange={() => handleFolderFilterToggle(filterOption)}
                                                        />
                                                    }
                                                    label={`${filterOption}`}
                                                />
                                            ))}
                                        </Box>
                                    </Menu>
                                </Paper>
                                <Paper className="d-flex justify-content-center rounded-5" elevation={2}>
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
                                <CustomDatePicker 
                                    startDate={startDate} 
                                    setStartDate={setStartDate} 
                                    endDate={endDate} 
                                    setEndDate={setEndDate} 
                                    viewsList={['year', 'month', 'day']}
                                />
                            </div>
                            <TableContainer component={Paper} elevation={3}>
                                <Table aria-label="Summary table">
                                    <TableHead className="bg-info-subtle">
                                        <TableRow>
                                            <TableCell align="center">Video ID</TableCell>
                                            <TableCell align="center" sx={{ width: 250, maxWidth: 250, minwidth: 250}}>
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
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "view_change_percent"}
                                                    direction={orderBy === "view_change_percent" ? order : "desc"}
                                                    onClick={() => handleTableSort("view_change_percent")}
                                                >
                                                    <Tooltip arrow title={<div className="text-center">View performance is calculated as the percent change between the total views of the last two months</div>} placement="top">
                                                        View Performance
                                                    </Tooltip>
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">Hihaho Folder</TableCell>
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
                                                        setPageNum(0);
                                                    }}>
                                                        {videoStat.video.video_id}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="border" align="center">
                                                    <Box sx={{width: 250, maxWidth: 250}}>
                                                        <button className="btn" onClick={() => {
                                                            if (searchQuery === "") {
                                                                setSearchQuery("\"" + videoStat.video.title + "\"");
                                                            } else {
                                                                setSearchQuery(searchQuery + " \"" + videoStat.video.title + "\"")
                                                            }
                                                            setPageNum(0);
                                                        }}>
                                                            {videoStat.video.title}
                                                        </button>
                                                    </Box>
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
                                                            <Tooltip arrow title={<>
                                                                    <div className="d-flex flex-row"><div className="text-warning">★★★★★</div>: {videoStat.one_star}</div>
                                                                    <div className="d-flex flex-row"><div className="text-warning">★★★★☆</div>: {videoStat.two_star}</div>
                                                                    <div className="d-flex flex-row"><div className="text-warning">★★★☆☆</div>: {videoStat.three_star}</div>
                                                                    <div className="d-flex flex-row"><div className="text-warning">★★☆☆☆</div>: {videoStat.four_star}</div>
                                                                    <div className="d-flex flex-row"><div className="text-warning">★☆☆☆☆</div>: {videoStat.five_star}</div></>
                                                                } placement="right">
                                                                {Number(videoStat.average_rating).toFixed(1)} ({videoStat.one_star + videoStat.two_star + videoStat.three_star + videoStat.four_star + videoStat.five_star})
                                                            </Tooltip>
                                                        ) : (
                                                            "N/A"
                                                        )}
                                                    </TableCell>
                                                }
                                                <TableCell className="border" align="right">{videoStat.video.status}</TableCell>
                                                <TableCell className="border" align="center">
                                                    <div className="d-flex flex-column">
                                                        <div className="my-2">
                                                            {videoStat.view_change_percent === 0 ? <TrendingFlatIcon/> : 
                                                            videoStat.view_change_percent > 0 ? <TrendingUpIcon className="text-success"/> : 
                                                            <TrendingDownIcon className="text-danger"/>}
                                                        </div>
                                                        <div className="my-2">
                                                            {videoStat.view_change_percent > 0 && "+"}{videoStat.view_change_percent}%
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="border" align="center">
                                                    {videoStat.video.folder_name} ({videoStat.video.folder_number})
                                                </TableCell>
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
                                                    <Tooltip arrow title="See question details" placement="right-end">
                                                        <Link to="/questions/" onClick={() => setVideoFilter(videoStat.video.video_id)}><IconButton><HelpOutlineIcon/></IconButton></Link>
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
                        } {dataView === "Interaction graphs" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center flex-wrap align-items-center">
                                <div className="my-3 d-flex flex-row justify-content-around">
                                    <button className="btn bg-info-subtle shadow-sm mx-2 p-3" onClick={() => setInteractionsPerTypeChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setInteractionsPerTypeChart("Bar")}>Bar Chart</button>
                                </div>
                                <Paper className="my-3 mx-2 d-flex justify-content-center rounded-5" elevation={2}>
                                    <IconButton onClick={(e) => setAnchorFolderFilterMenu(anchorFolderFilterMenu ? null : e.currentTarget)}>
                                        <FilterListIcon />
                                    </IconButton>
                                    <Menu anchorEl={anchorFolderFilterMenu} open={folderFilterMenuOpen} onClose={() => setAnchorFolderFilterMenu(null)}>
                                        <MenuItem disabled>
                                            <Typography variant="subtitle1">Folder Filter Options</Typography>
                                        </MenuItem>
                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                            {folderFilterMenuOptions.map((filterOption) => (
                                                <FormControlLabel key={filterOption} 
                                                    control={
                                                        <Checkbox 
                                                            checked={!folderFilters.includes(filterOption)} 
                                                            onChange={() => handleFolderFilterToggle(filterOption)}
                                                        />
                                                    }
                                                    label={`${filterOption}`}
                                                />
                                            ))}
                                        </Box>
                                    </Menu>
                                </Paper>
                                <Paper className="my-3 mx-2 d-flex justify-content-center rounded-5" elevation={2}>
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
                                <CustomDatePicker 
                                    startDate={startDate} 
                                    setStartDate={setStartDate} 
                                    endDate={endDate} 
                                    setEndDate={setEndDate} 
                                    viewsList={['year', 'month', 'day']}
                                />
                            </div>
                            {(allInteractions === null || allInteractions?.length <= 0) &&
                                <h4 className="text-center mt-4">Loading interaction data...</h4>
                            } {allInteractions?.length > 0 && interactionsPerTypeChart === "Pie" &&
                                <div className="d-flex flex-column justify-content-center">
                                    <p className="text-center">Total amount of interactions by type over a sample of 100 interactions</p>
                                    <PieChart
                                        colors={piePallette}
                                        series={[{
                                            arcLabel:(grouping) => `${grouping.label} (${grouping.value})`,
                                            data: itypeCountPieChartData,
                                            arcLabelMinAngle:35
                                        }]}
                                        width={800}
                                        height={400}
                                    />
                                </div>
                                
                            } {allInteractions?.length > 0 && interactionsPerTypeChart === "Bar" &&
                                <BarChart 
                                    xAxis={[{label:"Interaction type", data: itypeCountBarChartData.map(grouping => grouping.type)}]}
                                    yAxis={[{label:"Total interactions", width:60}]}
                                    series={[{label:"Total amount of interactions by type over a sample of 1000 interactions", data: itypeCountBarChartData.map(grouping => grouping.total_interactions), color:"#0dcaef"}]}
                                    width={900}
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
                        } {dataView === "Question graphs" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center flex-wrap align-items-center">
                                <div className="my-3 d-flex flex-row justify-content-around">
                                    <button className="btn bg-info-subtle shadow-sm mx-2 p-3" onClick={() => setQuestionsPerTypeChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2 p-3" onClick={() => setQuestionsPerTypeChart("Bar")}>Bar Chart</button>
                                </div>
                                <Paper className="my-3 mx-2 d-flex justify-content-center rounded-5" elevation={2}>
                                    <IconButton onClick={(e) => setAnchorFolderFilterMenu(anchorFolderFilterMenu ? null : e.currentTarget)}>
                                        <FilterListIcon />
                                    </IconButton>
                                    <Menu anchorEl={anchorFolderFilterMenu} open={folderFilterMenuOpen} onClose={() => setAnchorFolderFilterMenu(null)}>
                                        <MenuItem disabled>
                                            <Typography variant="subtitle1">Folder Filter Options</Typography>
                                        </MenuItem>
                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                            {folderFilterMenuOptions.map((filterOption) => (
                                                <FormControlLabel key={filterOption} 
                                                    control={
                                                        <Checkbox 
                                                            checked={!folderFilters.includes(filterOption)} 
                                                            onChange={() => handleFolderFilterToggle(filterOption)}
                                                        />
                                                    }
                                                    label={`${filterOption}`}
                                                />
                                            ))}
                                        </Box>
                                    </Menu>
                                </Paper>
                                <Paper className="my-3 mx-2 d-flex justify-content-center rounded-5" elevation={2}>
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
                                <CustomDatePicker 
                                    startDate={startDate} 
                                    setStartDate={setStartDate} 
                                    endDate={endDate} 
                                    setEndDate={setEndDate} 
                                    viewsList={['year', 'month', 'day']}
                                />
                            </div>
                            {(allQuestions === null || allQuestions?.length <= 0) &&
                                <h4 className="text-center mt-4">Loading question data...</h4>
                            } {allQuestions?.length > 0 && questionsPerTypeChart === "Pie" &&
                                <div className="d-flex flex-column justify-content-center">
                                    <p className="text-center">Total amount of questions by type over a sample of 1000 questions</p>
                                    <PieChart
                                        colors={piePallette}
                                        series={[{
                                            arcLabel:(grouping) => `${grouping.label} (${grouping.value})`,
                                            data: qtypeCountPieChartData,
                                            arcLabelMinAngle:35
                                        }]}
                                        width={800}
                                        height={400}
                                    />
                                </div>
                                
                            } {allQuestions?.length > 0 && questionsPerTypeChart === "Bar" &&
                                <BarChart 
                                    xAxis={[{label:"Question type", data: qtypeCountBarChartData.map(grouping => grouping.type)}]}
                                    yAxis={[{label:"Total questions", width:60}]}
                                    series={[{label:"Total amount of questions by type over a sample of 1000 questions", data: qtypeCountBarChartData.map(grouping => grouping.total_questions), color:"#0dcaef"}]}
                                    width={900}
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
                        }
                        
                    </div>
                </div>
            ) : (
                <p>You must be logged in to view this page.</p>
            )}
        </Layout>
    )
}

export default Summary