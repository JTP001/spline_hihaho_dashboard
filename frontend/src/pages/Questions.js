import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { useVideoFilter } from "../context/VideoFilterContext";
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

function Questions() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [videos, setVideos] = useState([]);
    const [questions, setQuestions] = useState([]);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [dataView, setDataView] = useState("Sessions by os");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("question_id");
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

        axiosInstance.get(`videos/${videoFilter}/questions/`)
            .then(res => {
                const questionData = res.data.map(question => ({
                    ...question,
                    created_at:dayjs(question.created_at)
                }));
                setQuestions(questionData);
                setPageNum(0);
            })
            .catch(err => console.error(err));
    }, [videoFilter])
    
    const handleSelectVideoFilterChange = (selectOption) => {
        setVideoFilter(selectOption.value);
    }

    const filteredQuestions = useMemo(() => {
        const searchTerms = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(term =>
            term.replace(/"/g, "").toLowerCase()
        ) || []; // Creates a list of search terms from the query of all words or strings in quotes split by spaces

        return questions.filter((question) => {
            const id = question.question_id.toString();
            const title = question.title.toLowerCase();
            const type = question.type.toLowerCase();

            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => 
                id.includes(term) || title.includes(term) || type.includes(term)
            );

            const matchesDate = 
                question.created_at.isSameOrAfter(startDate.startOf("day")) && 
                question.created_at.isSameOrBefore(endDate.endOf("day"));

            return matchesSearch && matchesDate;
        });
    }, [questions, searchQuery, startDate, endDate]);

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
                            <h1>Questions Details</h1>
                        </div>
                        <div className="my-3 d-flex flex-row flex-wrap justify-content-center">
                            <h3 className="me-3">Showing question data from: </h3>
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
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Questions table")}>Sessions table</button>
                        </div>
                        {dataView === "Questions table" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-around flex-wrap">
                                <Paper elevation={2} component="form" className="p-1 my-3 w-50 d-flex align-items-center">
                                    <SearchIcon className="mx-2" />
                                    <InputBase 
                                        className="flex-grow-1"
                                        placeholder="Search questions" 
                                        inputProps={{ 'aria-label': 'search questions' }} 
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
                                <Table aria-label="Questions table">
                                    <TableHead>
                                        <TableRow className="bg-info-subtle">
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "question_id"}
                                                    direction={orderBy === "question_id" ? order : "asc"}
                                                    onClick={() => handleTableSort("question_id")}
                                                >
                                                    Question ID
                                                </TableSortLabel> 
                                            </TableCell>
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
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "video_time_seconds"}
                                                    direction={orderBy === "video_time_seconds" ? order : "desc"}
                                                    onClick={() => handleTableSort("video_time_seconds")}
                                                >
                                                    Time in Video
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "average_answer_time_seconds"}
                                                    direction={orderBy === "average_answer_time_seconds" ? order : "desc"}
                                                    onClick={() => handleTableSort("average_answer_time_seconds")}
                                                >
                                                    Average Time to Answer
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "total_answred"}
                                                    direction={orderBy === "total_answred" ? order : "desc"}
                                                    onClick={() => handleTableSort("total_answred")}
                                                >
                                                    Total Answers
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "total_correctly_answred"}
                                                    direction={orderBy === "total_correctly_answred" ? order : "desc"}
                                                    onClick={() => handleTableSort("total_correctly_answred")}
                                                >
                                                    Total Correct Answers
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
                                        {[...filteredQuestions].sort(getTableComparator(order, orderBy))
                                            .slice(pageNum*rowsPerPage, pageNum*rowsPerPage + rowsPerPage)
                                            .map((question) => (
                                            <TableRow key={question.question_id}>
                                                <TableCell className="border" align="center">
                                                    <button className="btn" onClick={() => {
                                                        if (searchQuery === "") {
                                                            setSearchQuery(question.question_id.toString());
                                                        } else {
                                                            setSearchQuery(searchQuery + " " + question.question_id.toString())
                                                        }
                                                    }}>
                                                        {question.question_id}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="border" align="center">
                                                    <button className="btn" onClick={() => {
                                                        if (searchQuery === "") {
                                                            setSearchQuery("\"" + question.title + "\"");
                                                        } else {
                                                            setSearchQuery(searchQuery + " \"" + question.title + "\"")
                                                        }
                                                    }}>
                                                        {question.title}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="border" align="center">{question.type}</TableCell>
                                                <TableCell className="border" align="right">{question.video_time_seconds?.toLocaleString()}s</TableCell>
                                                <TableCell className="border" align="right">{question.average_answer_time_seconds?.toLocaleString()}s</TableCell>
                                                <TableCell className="border" align="right">{question.total_answered?.toLocaleString()}</TableCell>
                                                <TableCell className="border" align="right">{question.total_correctly_answered?.toLocaleString()}</TableCell>
                                                <TableCell className="border" align="center">{question.created_at.format("YYYY-MM-DD HH:mm")}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={filteredQuestions.length}
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
                        }
                        
                    </div>
                </div>
            ) : (
                <p>You must be logged in to view this page.</p>
            )}
        </Layout>
    )
}

export default Questions