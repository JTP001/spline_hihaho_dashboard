import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { useVideoFilter } from "../context/VideoFilterContext";
import { BarChart, LineChart } from '@mui/x-charts';
import { IconButton, Menu, MenuItem, Typography, FormControlLabel, Box, Radio, FormGroup, Checkbox, Tooltip } from '@mui/material';
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

function Questions() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [videos, setVideos] = useState([]);
    const [questions, setQuestions] = useState([]);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [dataView, setDataView] = useState("Correct answers per type graphs");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("question_id");
    const [order, setOrder] = useState("asc");
    const [searchQuery, setSearchQuery] = useState("");
    const [difficultQuestionFilter, setDifficultQuestionFilter] = useState(0);
    const [anchorFilterMenu, setAnchorFilterMenu] = useState(null); // Anchors the place the filter menu appears in the DOM
    const filterMenuOpen = Boolean(anchorFilterMenu); // Filter menu is open when it is not null
    const difficultQuestionBound = [0, 5, 10, 20, 50, 100, 200, 500];
    const [startDate, setStartDate] = useState(dayjs("2020-01-01"));
    const [endDate, setEndDate] = useState(dayjs());
    const [excludeOpenAndRating, setExcludeOpenAndRating] = useState(true);
    const [lineChartVisible, setLineChartVisible] = useState({
        answered: true,
        correctly_answered: true,
    });

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
                    created_at:dayjs(question.created_at)
                }));
                setQuestions(questionData);
                setPageNum(0);
            })
            .catch(err => console.error(err));
    }, [videoFilter]);

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

            const matchesFilter = question.average_answer_time_seconds > difficultQuestionFilter;

            return matchesSearch && matchesDate && matchesFilter;
        });
    }, [questions, searchQuery, difficultQuestionFilter, startDate, endDate]);

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
    const correctAnswersByType = filteredQuestions.filter(question => {
        if (excludeOpenAndRating) { // Note "open" questions have type essay, type open is for "entry" questions
            return !(question.type === "rating" || question.type === "essay" || question.type === "vacancy") 
        } else {return question}
    }).reduce((total, question) => {
        let type = question.type;
        if (type === "open") {
            type = "entry"; // Hihaho's typing does not match the naming system, so changing it makes it more obvious on the graph
        } else if (type === "essay") {
            type = "open";
        } else if (type === "vacancy") {
            type = "form";
        }

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
    const lineChartQuestions = [...filteredQuestions].sort((a, b) => a.video_time_seconds - b.video_time_seconds)
        .filter(question => {
            if (excludeOpenAndRating) { // Note "open" questions have type essay, type open is for "entry" questions
                return !(question.type === "rating" || question.type === "essay" || question.type === "vacancy")
            } else {return question}
        }).map(question => `${question.title} (${question.video_time_seconds}s)`);
    const lineChartAnswered = filteredQuestions
        .filter(question => {
            if (excludeOpenAndRating) { // Note "open" questions have type essay, type open is for "entry" questions
                return !(question.type === "rating" || question.type === "essay" || question.type === "vacancy")
            } else {return question}
        }).map(question => question.total_answered);
    const lineChartCorrectlyAnswered = filteredQuestions
        .filter(question => {
            if (excludeOpenAndRating) { // Note "open" questions have type essay, type open is for "entry" questions
                return !(question.type === "rating" || question.type === "essay" || question.type === "vacancy")
            } else {return question}
        }).map(question => question.total_correctly_answered);

    const toggleLineChartVisible = (line) => {
        setLineChartVisible(prev => ({
            ...prev,
            [line]: !prev[line]
        }));
    };

    //-------------------------------Rendered page elements-------------------------------//
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
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Correct answers per type graphs")}>Correct Answers per type</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Total answers by questions graph")}>Answers by questions</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Questions table")}>Questions table</button>
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
                                <Paper className="my-3 d-flex justify-content-center rounded-5" elevation={2}>
                                    <IconButton onClick={(e) => setAnchorFilterMenu(anchorFilterMenu ? null : e.currentTarget)}>
                                        <FilterListIcon />
                                    </IconButton>
                                    <Menu anchorEl={anchorFilterMenu} open={filterMenuOpen} onClose={() => setAnchorFilterMenu(null)}>
                                        <MenuItem disabled>
                                            <Typography variant="subtitle1">Difficult question bound filter</Typography>
                                        </MenuItem>
                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                            {difficultQuestionBound.map(bound => 
                                                <FormControlLabel 
                                                    control={
                                                        <Radio 
                                                            checked={difficultQuestionFilter === bound} 
                                                            onChange={() => setDifficultQuestionFilter(bound)}
                                                        />
                                                    }
                                                    label={`> ${bound} seconds on average`}
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
                                                    active={orderBy === "total_correctly_answered"}
                                                    direction={orderBy === "total_correctly_answered" ? order : "desc"}
                                                    onClick={() => handleTableSort("total_correctly_answered")}
                                                >
                                                    Total Correct Answers
                                                </TableSortLabel> 
                                            </TableCell>
                                            <TableCell align="center">
                                                <TableSortLabel 
                                                    active={orderBy === "percent_correct"}
                                                    direction={orderBy === "percent_correct" ? order : "desc"}
                                                    onClick={() => handleTableSort("percent_correct")}
                                                >
                                                    Percent Correct
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
                                                <TableCell className="border" align="right">
                                                    {!['open', 'essay', 'vacancy'].includes(question.type) ? `${question.percent_correct}%` : "N/A"}
                                                </TableCell>
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
                        } {dataView === "Correct answers per type graphs" &&
                            <div className="d-flex flex-column">
                            <div className="d-flex flex-row justify-content-center flex-wrap">
                                <Tooltip arrow placement="top" title="Open, Form and Rating questions have no 'correct answer' and are therefore counted as having received 0 correct answers">
                                    {excludeOpenAndRating ? (
                                        <button className="btn bg-info-subtle my-3" onClick={() => setExcludeOpenAndRating(false)}>Include Open, Form and Rating questions</button>
                                    ) : (
                                        <button className="btn bg-info-subtle my-3" onClick={() => setExcludeOpenAndRating(true)}>Exclude Open, Form and Rating questions</button>
                                    )}
                                </Tooltip>
                                <Paper className="mx-2 my-3 d-flex justify-content-center rounded-5" elevation={2}>
                                    <IconButton onClick={(e) => setAnchorFilterMenu(anchorFilterMenu ? null : e.currentTarget)}>
                                        <FilterListIcon />
                                    </IconButton>
                                    <Menu anchorEl={anchorFilterMenu} open={filterMenuOpen} onClose={() => setAnchorFilterMenu(null)}>
                                        <MenuItem disabled>
                                            <Typography variant="subtitle1">Difficult question bound filter</Typography>
                                        </MenuItem>
                                        <Box px={2} className="d-flex flex-column" gap={1}>
                                            {difficultQuestionBound.map(bound => 
                                                <FormControlLabel 
                                                    control={
                                                        <Radio
                                                            checked={difficultQuestionFilter === bound} 
                                                            onChange={() => setDifficultQuestionFilter(bound)}
                                                        />
                                                    }
                                                    label={`> ${bound} seconds on average`}
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
                                        {excludeOpenAndRating ? (
                                            <button className="btn bg-info-subtle my-3" onClick={() => setExcludeOpenAndRating(false)}>Include Open, Form and Rating questions</button>
                                        ) : (
                                            <button className="btn bg-info-subtle my-3" onClick={() => setExcludeOpenAndRating(true)}>Exclude Open, Form and Rating questions</button>
                                        )}
                                    </Tooltip>
                                </div>
                                <LineChart 
                                    xAxis={[{scaleType:'point', data:lineChartQuestions}]}
                                    series={[
                                        lineChartVisible.answered && {data:lineChartAnswered, label:'Total answers', color:"dodgerblue", showMark:false},
                                        lineChartVisible.correctly_answered && {data:lineChartCorrectlyAnswered, label:'Total correct answers', color:"orange", showMark:false},
                                    ].filter(Boolean)} // To filter out lines toggled off (false)
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

export default Questions