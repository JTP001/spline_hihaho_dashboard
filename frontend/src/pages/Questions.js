import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import { useVideoFilter } from "../context/VideoFilterContext";
import { BarChart, LineChart, PieChart } from '@mui/x-charts';
import { IconButton, Menu, MenuItem, Typography, FormControlLabel, Box, Radio, FormGroup, Checkbox, Tooltip } from '@mui/material';
import FilterListIcon from "@mui/icons-material/FilterList";
import BarChartIcon from '@mui/icons-material/BarChart';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import Select from 'react-select';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel } from "@mui/material";
import { Paper, InputBase } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SummarizeIcon from '@mui/icons-material/Summarize';
import dayjs from "dayjs";
import axiosInstance from "../components/AxiosInstance";
import CustomDatePicker from "../components/CustomDatePicker";
import TablePaginationWithJump from "../components/TablePaginationWithJump";

var isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

function Questions() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [videos, setVideos] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [answers, setAnswers] = useState([]);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [dataView, setDataView] = useState("Correct answers per type graph");
    const [responseBreakdownChart, setResponseBreakdownChart] = useState("Bar");
    const [questionsPerTypeChart, setQuestionsPerTypeChart] = useState("Bar");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("question_id");
    const [order, setOrder] = useState("asc");
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState(dayjs("2020-01-01"));
    const [endDate, setEndDate] = useState(dayjs());
    const [typesIncludeExclude, setTypesIncludeExclude] = useState(false);
    const piePallette = ["#0dcaef", "sandybrown", "lightgreen", "tomato", "mediumorchid", "khaki", "lightpink", "chocolate", "darksalmon", "aquamarine", "bisque", "green", "purple", "orange", "brown", "darkcyan"];
    const [lineChartVisible, setLineChartVisible] = useState({
        answered: true,
        correctly_answered: true,
    });

    //-------------------------------Table filter constants-------------------------------//
    const typeFilterOptions = ['mc', 'mr', 'image', 'entry', 'open', 'essay', 'vacancy', 'rating'];
    const [typeFilter, setTypeFilter] = useState(typeFilterOptions);
    const [anchorTypeFilter, setAnchorTypeFilter] = useState(null);
    const TypeFilterOpen = Boolean(anchorTypeFilter);
    const avgTimeFilterOptions = [0, 10, 20, 30, 60, 120, 240];
    const [avgTimeFilter, setAvgTimeFilter] = useState(0);
    const [anchorAvgTimeFilter, setAnchorAvgTimeFilter] = useState(null);
    const avgTimeFilterOpen = Boolean(anchorAvgTimeFilter);
    const correctPercentFilterOptions = ["all", "= 0%", "≥ 25%", "≤ 25%", "≥ 50%", "≤ 50%", "≥ 75%", "≤ 75%", "= 100%"];
    const [correctPercentFilter, setCorrectPercentFilter] = useState("all");
    const [anchorCorrectPercentFilter, setAnchorCorrectPercentFilter] = useState(null);
    const correctPercentFilterOpen = Boolean(anchorCorrectPercentFilter);

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

    //------------------------------Get videos and set filter------------------------------//
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
    
    const handleSelectVideoFilterChange = (selectOption) => {
        setVideoFilter(selectOption.value);
    };

    //----------------------------------Get questions----------------------------------//
    useEffect(() => {
        if (!videoFilter) return; // Ignore any attempts to call this before videoFilter is set

        axiosInstance.get(`videos/${videoFilter}/questions/`)
            .then(res => {
                const questionData = res.data.map(question => ({
                    ...question,
                    title:(question.title.slice(0, 18) === "<!--TINYMCE-->\n<p>") ? 
                        question.title.slice(18, -4) : 
                            (question.title.slice(0, 14) === "<!--TINYMCE-->") ? 
                            question.title.slice(15) : question.title,
                    percent_correct:question.total_answered > 0
                        ? Math.round((question.total_correctly_answered / question.total_answered) * 100)
                        : 0, // Makes sure that there's no divide by 0 error
                    created_at: question.created_at ? dayjs(question.created_at) : dayjs(0)
                }));
                setQuestions(questionData);
                setPageNum(0);
                setSelectedQuestion(questionData.filter((question) => 
                    !['open', 'essay', 'vacancy', 'rating'].includes(question.type))[0]?.question_id
                );
            })
            .catch(err => console.error(err));
    }, [videoFilter]);

    useEffect(() => {
        if (!selectedQuestion) return;

        axiosInstance.get(`videos/${selectedQuestion}/question_answers/`)
            .then(res => {
                setAnswers(res.data);
            })
            .catch(err => {
                console.error(err);
            })
    }, [selectedQuestion]);

    //----------------------------------Handle filtering----------------------------------//
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

            const matchesTypeFilter = typeFilter.includes(question.type);
            const matchesAvgTimeFilter = question.average_answer_time_seconds > avgTimeFilter;
            let matchesCorrectPercentFilter = true;
            if (correctPercentFilter === "≥ 25%") {matchesCorrectPercentFilter = question.percent_correct >= 25}
            else if (correctPercentFilter === "≤ 25%") {matchesCorrectPercentFilter = question.percent_correct <= 25}
            else if (correctPercentFilter === "≥ 50%") {matchesCorrectPercentFilter = question.percent_correct >= 50}
            else if (correctPercentFilter === "≤ 50%") {matchesCorrectPercentFilter = question.percent_correct <= 50}
            else if (correctPercentFilter === "≥ 75%") {matchesCorrectPercentFilter = question.percent_correct >= 75}
            else if (correctPercentFilter === "≤ 75%") {matchesCorrectPercentFilter = question.percent_correct <= 75}
            else if (correctPercentFilter === "= 0%") {matchesCorrectPercentFilter = question.percent_correct === 0}
            else if (correctPercentFilter === "= 100%") {matchesCorrectPercentFilter = question.percent_correct === 100}

            return matchesSearch && matchesDate && matchesTypeFilter && matchesAvgTimeFilter && matchesCorrectPercentFilter;
        });
    }, [questions, searchQuery, typeFilter, avgTimeFilter, correctPercentFilter, startDate, endDate]);

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
        return order === "desc" 
            ? (a, b) => descendingComparator(a, b, orderBy)
            : (a, b) => -descendingComparator(a, b, orderBy);
    };
    
    //---------------------------Create 'by type' bar chart data---------------------------//
    const correctAnswersByType = filteredQuestions.reduce((total, question) => {
        let type = question.type;
        if (!total[type]) {
            total[type] = {"correct": 0, "incorrect": 0};
        }
        total[type]["correct"] += question.total_correctly_answered;
        total[type]["incorrect"] += (question.total_answered - question.total_correctly_answered);
        return total
    }, {});

    const qTypeBarChartData = Object.entries(correctAnswersByType).map(([type, answered_totals]) => ({
        type,
        ...answered_totals,
    }));

    //--------------------Create 'answers by questions' line chart data--------------------//
    const lineChartDataSorted = [...filteredQuestions].sort((a, b) => a.video_time_seconds - b.video_time_seconds)
    const lineChartQuestions = lineChartDataSorted.map(question => `${question.title} (${question.video_time_seconds}s)`);
    const lineChartAnswered = lineChartDataSorted.map(question => question.total_answered);
    const lineChartCorrectlyAnswered = lineChartDataSorted.map(question => question.total_correctly_answered);

    const toggleLineChartVisible = (line) => {
        setLineChartVisible(prev => ({
            ...prev,
            [line]: !prev[line]
        }));
    };
    
    //--------------------Create 'answered count by question' chart data--------------------//
    const answeredByQuestionBarData = answers.filter((answer) => answer.question.question_id === selectedQuestion)
        .map((answer) => ({label:answer.label, value:answer.answered_count, color:answer.is_correct_answer ? "#0dcaef" : "tomato"}))
        .sort((a, b) => b.value - a.value);

    const answeredByQuestionPieData = answeredByQuestionBarData.map((answer, index) => {
            const question = questions.find(question => question.question_id === selectedQuestion);
            const percent = ((answer.value/question.total_answered) * 100).toFixed(1);
            const label = answer.label.length > 30 ? answer.label.slice(0, 27) + "..." : answer.label
            return {id:index, label:`"${label}": ${percent}% (${answer.value})`, value:answer.value, color:answer.color};
        });

    //----------------------Create 'questions by type' chart data----------------------//
    const questionCountByType = filteredQuestions.reduce((total, question) => {
        const type = question.type;
        if (!total[type]) {
            total[type] = 0;
        }
        total[type] += 1;
        return total
    }, {});

    const typeCountBarChartData = Object.entries(questionCountByType).map(([type, total_questions]) => ({
        type,
        total_questions,
    })).sort((a, b) => b.total_questions - a.total_questions);;

    const typeCountPiePercentData = typeCountBarChartData.reduce((sum, grouping) => sum += grouping.total_questions, 1)

    const typeCountPieChartData = typeCountBarChartData.map((grouping, index) => {
        const percent = ((grouping.total_questions/typeCountPiePercentData) * 100).toFixed(1);
        return {id:index, value:grouping.total_questions, label:`${grouping.type}: ${percent}%`};
    })

    //--------------------------------Handle extra filters--------------------------------//
    const handleTypeFilterToggle = (value) => {
        setTypeFilter((prev) => 
            prev.includes(value) 
                ? prev.filter((val) => val !== value) // Removes value from filters list if it was in it
                : [...prev, value] // Adds value to filters list if it was not in it
        );
    };

    const handleTypesIncludeExclude = (option) => {
        const noAnswerTypes = ['essay', 'vacancy', 'rating'];

        setTypeFilter((prev) => {
            if (option === "include") {
                const newSet = new Set([...prev, ...noAnswerTypes]);
                return Array.from(newSet);
            } else if (option === "exclude") {
                return prev.filter((type) => !noAnswerTypes.includes(type));
            } else {return prev}
        });
    };

    //-------------------------------Rendered page elements-------------------------------//
    return (
        <Layout>
            {isLoggedIn ? (
                <div className="container rounded min-vh-100">
                    <div className="mx-3 d-flex flex-column justify-content-center">
                        <div className="my-3 d-flex flex-row justify-content-center">
                            <h1>Question Details</h1>
                        </div>
                        <h3 className="mx-auto">Showing questions from: </h3>
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
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Correct answers per type graph")}>Correct Answers per type</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Response breakdown graph")}>Response breakdown</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Total answers by questions graph")}>Answers by questions</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Questions per type graphs")}>Questions per type</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Questions table")}>Questions table</button>
                        </div>
                        {dataView === "Questions table" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-around flex-wrap align-items-center">
                                <Paper elevation={2} component="form" className="p-2 w-50 d-flex align-items-center">
                                    <SearchIcon className="mx-2" />
                                    <InputBase 
                                        className="flex-grow-1"
                                        placeholder="Search questions" 
                                        inputProps={{ 'aria-label': 'search questions' }} 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                    />
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
                                            <TableCell align="center">
                                                <div className="d-flex flex-row">
                                                Question Type
                                                <div className="d-flex justify-content-center rounded-5">
                                                    <IconButton onClick={(e) => setAnchorTypeFilter(anchorTypeFilter ? null : e.currentTarget)}>
                                                        <FilterListIcon />
                                                    </IconButton>
                                                    <Menu anchorEl={anchorTypeFilter} open={TypeFilterOpen} onClose={() => setAnchorTypeFilter(null)}>
                                                        <MenuItem disabled>
                                                            <Typography variant="subtitle1">Question type filter</Typography>
                                                        </MenuItem>
                                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                                            {typeFilterOptions.map(option => 
                                                                <FormControlLabel 
                                                                    control={
                                                                        <Checkbox
                                                                            checked={typeFilter.includes(option)} 
                                                                            onChange={() => handleTypeFilterToggle(option)}
                                                                        />
                                                                    }
                                                                    label={option}
                                                                />
                                                            )}
                                                        </Box>
                                                    </Menu>
                                                </div>
                                                </div>
                                            </TableCell>
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
                                                <div className="d-flex flex-row">
                                                <TableSortLabel 
                                                    active={orderBy === "average_answer_time_seconds"}
                                                    direction={orderBy === "average_answer_time_seconds" ? order : "desc"}
                                                    onClick={() => handleTableSort("average_answer_time_seconds")}
                                                >
                                                    Average Seconds to Answer
                                                </TableSortLabel> 
                                                <div className="d-flex justify-content-center rounded-5">
                                                    <IconButton onClick={(e) => setAnchorAvgTimeFilter(anchorAvgTimeFilter ? null : e.currentTarget)}>
                                                        <FilterListIcon />
                                                    </IconButton>
                                                    <Menu anchorEl={anchorAvgTimeFilter} open={avgTimeFilterOpen} onClose={() => setAnchorAvgTimeFilter(null)}>
                                                        <MenuItem disabled>
                                                            <Typography variant="subtitle1">Average seconds to answer filter</Typography>
                                                        </MenuItem>
                                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                                            {avgTimeFilterOptions.map(option => 
                                                                <FormControlLabel 
                                                                    control={
                                                                        <Radio 
                                                                            checked={avgTimeFilter === option} 
                                                                            onChange={() => setAvgTimeFilter(option)}
                                                                        />
                                                                    }
                                                                    label={`> ${option}s`}
                                                                />
                                                            )}
                                                        </Box>
                                                    </Menu>
                                                </div>
                                                </div>
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
                                                    active={orderBy === "total_correctly_answered"}
                                                    direction={orderBy === "total_correctly_answered" ? order : "desc"}
                                                    onClick={() => handleTableSort("total_correctly_answered")}
                                                >
                                                    Total Correct Answers
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <div className="d-flex flex-row">
                                                <TableSortLabel 
                                                    active={orderBy === "percent_correct"}
                                                    direction={orderBy === "percent_correct" ? order : "desc"}
                                                    onClick={() => handleTableSort("percent_correct")}
                                                >
                                                    Percent Correct
                                                </TableSortLabel> 
                                                <div className="d-flex justify-content-center rounded-5">
                                                    <IconButton onClick={(e) => setAnchorCorrectPercentFilter(anchorCorrectPercentFilter ? null : e.currentTarget)}>
                                                        <FilterListIcon />
                                                    </IconButton>
                                                    <Menu anchorEl={anchorCorrectPercentFilter} open={correctPercentFilterOpen} onClose={() => setAnchorCorrectPercentFilter(null)}>
                                                        <MenuItem disabled>
                                                            <Typography variant="subtitle1">Percent correct filter</Typography>
                                                        </MenuItem>
                                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                                            {correctPercentFilterOptions.map(option => 
                                                                <FormControlLabel 
                                                                    control={
                                                                        <Radio 
                                                                            checked={correctPercentFilter === option} 
                                                                            onChange={() => setCorrectPercentFilter(option)}
                                                                        />
                                                                    }
                                                                    label={option}
                                                                />
                                                            )}
                                                        </Box>
                                                    </Menu>
                                                </div>
                                                </div>
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
                                                <TableCell className="border" align="right">
                                                    {!['open', 'essay', 'vacancy'].includes(question.type) ? `${question.percent_correct}%` : "N/A"}
                                                </TableCell>
                                                <TableCell className="border" align="center">{question.created_at !== dayjs(0) ? question.created_at.format("YYYY-MM-DD HH:mm") : "None"}</TableCell>
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
                                    ActionsComponent={TablePaginationWithJump}
                                    sx={{
                                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                        marginBottom: 0,
                                        }
                                    }}
                                />
                            </TableContainer>
                            </div>
                        } {dataView === "Correct answers per type graph" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center flex-wrap">
                                <Tooltip arrow placement="top" title="Open, Form and Rating questions have no 'correct answer' and are therefore counted as having received 0 correct answers">
                                    {typesIncludeExclude ? (
                                        <button className="btn bg-info-subtle my-3" onClick={() => {handleTypesIncludeExclude("include"); setTypesIncludeExclude(false)}}>Include Open, Form and Rating questions</button>
                                    ) : (
                                        <button className="btn bg-info-subtle my-3" onClick={() => {handleTypesIncludeExclude("exclude"); setTypesIncludeExclude(true)}}>Exclude Open, Form and Rating questions</button>
                                    )}
                                </Tooltip>
                                <Paper className="mx-2 my-3 d-flex justify-content-center rounded-5" elevation={2}>
                                    <IconButton onClick={(e) => setAnchorAvgTimeFilter(anchorAvgTimeFilter ? null : e.currentTarget)}>
                                        <FilterListIcon />
                                    </IconButton>
                                    <Menu anchorEl={anchorAvgTimeFilter} open={avgTimeFilterOpen} onClose={() => setAnchorAvgTimeFilter(null)}>
                                        <MenuItem disabled>
                                            <Typography variant="subtitle1">Average seconds to answer filter</Typography>
                                        </MenuItem>
                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                            {avgTimeFilterOptions.map(option => 
                                                <FormControlLabel 
                                                    control={
                                                        <Radio 
                                                            checked={avgTimeFilter === option} 
                                                            onChange={() => setAvgTimeFilter(option)}
                                                        />
                                                    }
                                                    label={`> ${option}s`}
                                                />
                                            )}
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
                            {qTypeBarChartData.length > 0 ? (
                                <BarChart 
                                    xAxis={[{label:"Question type", data: qTypeBarChartData.map(grouping => grouping.type)}]}
                                    yAxis={[{label:"Total answers", width:60}]}
                                    series={[
                                        {label:"Correct answers", data: qTypeBarChartData.map(grouping => grouping.correct), color:"#0dcaef", stack:'a'},
                                        {label:"Incorrect answers", data: qTypeBarChartData.map(grouping => grouping.incorrect), color:"tomato", stack:'a'}
                                    ]}
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
                            ) : (
                                <Paper className="mt-4 mx-auto d-flex flex-row flex-wrap justify-content-center rounded-5 p-3" elevation={2}>
                                    <HighlightOffIcon className="mx-2"/>
                                    <h5>No question data to display</h5>
                                </Paper>
                            )}
                            </div>
                        } {dataView === "Response breakdown graph" &&
                            <div className="d-flex flex-column">
                            <div className="my-3 d-flex flex-row flex-wrap justify-content-center">
                                <h4 className="me-3 my-1">Selected question: </h4>
                                <Tooltip arrow placement="top" title="Only includes questions that have a finite pool of correct or incorrect responses">
                                    <Paper className="w-50" elevation={2}>
                                        <Select 
                                            className="basic-single" 
                                            classNamePrefix="select"
                                            value={questions
                                                .filter((question) => !['open', 'essay', 'vacancy', 'rating'].includes(question.type))
                                                .map(question => ({
                                                    value: question.question_id,
                                                    label: `${question.title} (ID: ${question.question_id})`
                                                })).find(option => option.value === selectedQuestion)}
                                            isSearchable={true}
                                            name="Question selection"
                                            options={questions
                                                .filter((question) => !['open', 'essay', 'vacancy', 'rating'].includes(question.type))
                                                .map(question => ({
                                                value:question.question_id,
                                                label:`${question.title} (ID: ${question.question_id})`,
                                            }))}
                                            onChange={(selectedOption) => setSelectedQuestion(selectedOption.value)}
                                            styles={{menu:(provided) => ({...provided, zIndex:1500})}}
                                        />
                                    </Paper>
                                </Tooltip>
                            </div>
                            <div className="my-3 d-flex flex-row justify-content-center">
                                <div className="d-flex flex-row justify-content-center">
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setResponseBreakdownChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setResponseBreakdownChart("Bar")}>Bar Chart</button>
                                </div>
                                <div className="d-flex flex-row justify-content-around">
                                    <p className="my-2">Response breakdown for all questions: </p>
                                    <Link to={`https://studio.hihaho.com/stats/${videos.find(video => video.video_id === videoFilter)?.uuid}`} target="_blank"><IconButton><BarChartIcon /></IconButton></Link>
                                </div>
                            </div>
                            {answeredByQuestionBarData.length > 0 ? (
                            <>
                                {responseBreakdownChart === "Bar" &&
                                    <BarChart 
                                        xAxis={[{
                                            label: "Options",
                                            scaleType: "band",
                                            data: answeredByQuestionBarData.map(answer => answer.label),
                                            colorMap: {
                                                type: "ordinal",
                                                values: answeredByQuestionBarData.map(answer => answer.label),
                                                colors: answeredByQuestionBarData.map(answer => answer.color),
                                            }
                                        }]}
                                        yAxis={[{label:"Number of responses"}]}
                                        series={[{
                                            label:"Number of responses",
                                            data:answeredByQuestionBarData.map(answer => answer.value)
                                        }]}
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
                                } {responseBreakdownChart === "Pie" &&
                                    <PieChart 
                                        series={[{
                                            data:answeredByQuestionPieData,
                                            arcLabel:(answer) => answer.label,
                                            arcLabelMinAngle:15
                                        }]}
                                        width={800}
                                        height={400}
                                    />
                                }
                            </>
                            ) : (
                                <Paper className="mt-4 mx-auto d-flex flex-row flex-wrap justify-content-center rounded-5 p-3" elevation={2}>
                                    <HighlightOffIcon className="mx-2"/>
                                    <h5>No answer data to display</h5>
                                </Paper>
                            )}
                            </div>
                        } {dataView === "Total answers by questions graph" &&
                            <div className="d-flex flex-column justify-content-center">
                                <div className="d-flex flex-row justify-content-center flex-wrap">
                                    <FormGroup className="d-flex flex-row my-3">
                                        <FormControlLabel
                                            control={
                                            <Checkbox checked={lineChartVisible.answered}  onChange={() => toggleLineChartVisible('answered')}/>
                                            }
                                            label="Answered"
                                        />
                                        <FormControlLabel
                                            control={
                                            <Checkbox checked={lineChartVisible.correctly_answered} onChange={() => toggleLineChartVisible('correctly_answered')}/>
                                            }
                                            label="Correctly answered"
                                        />
                                    </FormGroup>
                                    <Tooltip arrow placement="top" title="Open, Form and Rating questions have no 'correct answer' and are therefore counted as having received 0 correct answers">
                                        {typesIncludeExclude ? (
                                            <button className="btn bg-info-subtle my-3" onClick={() => {handleTypesIncludeExclude("include"); setTypesIncludeExclude(false)}}>Include Open, Form and Rating questions</button>
                                        ) : (
                                            <button className="btn bg-info-subtle my-3" onClick={() => {handleTypesIncludeExclude("exclude"); setTypesIncludeExclude(true)}}>Exclude Open, Form and Rating questions</button>
                                        )}
                                    </Tooltip>
                                </div>
                                {filteredQuestions.length > 1 ? (
                                    <LineChart 
                                        xAxis={[{scaleType:'point', data:lineChartQuestions}]}
                                        series={[
                                            lineChartVisible.answered && {data:lineChartAnswered, label:'Total answers', color:"dodgerblue", showMark:false},
                                            lineChartVisible.correctly_answered && {data:lineChartCorrectlyAnswered, label:'Total correct answers', color:"orange", showMark:false},
                                        ].filter(Boolean)} // To filter out lines toggled off (false)
                                        height={400}
                                    />
                                ) : (
                                    <Paper className="mt-4 mx-auto d-flex flex-row flex-wrap justify-content-center rounded-5 p-3" elevation={2}>
                                        <HighlightOffIcon className="mx-2"/>
                                        <h5>Too little data to display</h5>
                                    </Paper>
                                )}
                            </div>
                        } {dataView === "Questions per type graphs" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center flex-wrap">
                                <div className="my-3 d-flex flex-row justify-content-around">
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setQuestionsPerTypeChart("Pie")}>Pie Chart</button>
                                    <button className="btn bg-info-subtle shadow-sm mx-2" onClick={() => setQuestionsPerTypeChart("Bar")}>Bar Chart</button>
                                </div>
                                <CustomDatePicker 
                                    startDate={startDate} 
                                    setStartDate={setStartDate} 
                                    endDate={endDate} 
                                    setEndDate={setEndDate} 
                                    viewsList={['year', 'month', 'day']}
                                />
                            </div>
                            {filteredQuestions.length > 0 ? (
                                <>
                                {questionsPerTypeChart === "Pie" &&
                                    <PieChart
                                        colors={piePallette}
                                        series={[{
                                            arcLabel:(grouping) => `${grouping.label} (${grouping.value})`,
                                            data: typeCountPieChartData,
                                            arcLabelMinAngle:40
                                        }]}
                                        width={800}
                                        height={400}
                                    />
                                } {questionsPerTypeChart === "Bar" &&
                                    <BarChart 
                                        xAxis={[{label:"Question type", data: typeCountBarChartData.map(grouping => grouping.type)}]}
                                        yAxis={[{label:"Total questions", width:60}]}
                                        series={[{label:"Total amount of questions per type", data: typeCountBarChartData.map(grouping => grouping.total_questions), color:"#0dcaef"}]}
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
                                    <h5>No question data to display</h5>
                                </Paper>
                            )}
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