import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import { useVideoFilter } from "../context/VideoFilterContext";
import { LineChart } from '@mui/x-charts';
import Select from 'react-select';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel } from "@mui/material";
import { FormGroup, FormControlLabel, Checkbox, Paper, Tooltip, IconButton } from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import SummarizeIcon from '@mui/icons-material/Summarize';
import dayjs from "dayjs";
import axiosInstance from "../components/AxiosInstance";
import CustomDatePicker from "../components/CustomDatePicker";
import TablePaginationWithJump from "../components/TablePaginationWithJump";
import useAuthCheck from "../components/useAuthHook";
import LoadingOrLogin from "../components/LoadingOrLogin";

var isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

function MonthlyView() {
    const { user, loadingLogin } = useAuthCheck();
    const [videos, setVideos] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const { videoFilter, setVideoFilter } = useVideoFilter();
    const [dataView, setDataView] = useState("Views per month line chart");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [pageNum, setPageNum] = useState(0);
    const [orderBy, setOrderBy] = useState("month");
    const [order, setOrder] = useState("asc");
    const [startDate, setStartDate] = useState(dayjs("2020-01-01"));
    const [endDate, setEndDate] = useState(dayjs());
    const [exportDate, setExportDate] = useState(dayjs());
    const [lineChartVisible, setLineChartVisible] = useState({
        started: true,
        finished: true,
        passed: true,
        failed: true,
        unfinished: true
    });

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
    }

    //----------------------------------Get monthly views----------------------------------//
    useEffect(() => {
        if (!videoFilter) return; // Ignore any attempts to call this before videoFilter is set

        axiosInstance.get(`videos/${videoFilter}/monthly_views/`)
            .then(res => {
                const monthData = res.data.map(month => ({ // Section that adds view_rate for table
                    ...month,
                    month: dayjs(month.month),
                    retention_rate: month.started_views > 0
                    ? Math.round((month.finished_views / month.started_views) * 100)
                    : 0, // Makes sure that there's no divide by 0 error
                    pass_rate: month.total_views > 0
                    ? Math.round((month.passed_views / month.started_views) * 100)
                    : 0,
                }));
                setMonthlyData(monthData);
                setPageNum(0);
            })
            .catch(err => console.error(err));
    }, [videoFilter]);

    //----------------------------------Handle filtering----------------------------------//
    const filteredMonthlyData = monthlyData.filter((month) =>
        (month.month.isSameOrAfter(startDate.startOf("month"), 'month') && 
        month.month.isSameOrBefore(endDate.endOf("month"), 'month'))
    );
    
    //--------------------Create 'views by month' line chart data--------------------//
    const sortedMonthlyData = [...filteredMonthlyData].sort((a, b) => a.month < b.month)
    const lineChartMonths = sortedMonthlyData.map(monthData => monthData.month.format('MMM YYYY'));
    const lineChartStartedViews = sortedMonthlyData.map(monthData => monthData.started_views);
    const lineChartFinishedViews = sortedMonthlyData.map(monthData => monthData.finished_views);
    const lineChartPassedViews = sortedMonthlyData.map(monthData => monthData.passed_views);
    const lineChartFailedViews = sortedMonthlyData.map(monthData => monthData.failed_views);
    const lineChartUnfinishedViews = sortedMonthlyData.map(monthData => monthData.unfinished_views);

    const toggleLineChartVisible = (line) => {
        setLineChartVisible(prev => ({
            ...prev,
            [line]: !prev[line]
        }));
    };
    
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

    //----------------------------------Handle export----------------------------------//
    const handleExport = async (month, exportType) => {
        if (exportType === "filter") {
            try {
                const response = await axiosInstance.get(`videos/export/monthly_views/${month}/`, {
                responseType: "blob",
            });
            // Sets up the link to download the CSV, then goes to it and cleans up afterwards
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${month}_views_filtered_data.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            } catch (error) {
                console.error("Error downloading CSV", error);
            }
        } else if (exportType === "all") {
            try {
                const response = await axiosInstance.get(`videos/export/monthly_views/${month}/all/`, {
                responseType: "blob",
            });
            // Sets up the link to download the CSV, then goes to it and cleans up afterwards
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${month}_views_all_data.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            } catch (error) {
                console.error("Error downloading CSV", error);
            }
        }else {
            console.error("Not accepted export type");
        }
    }

    //-------------------------------Rendered page elements-------------------------------//
    return (
        <Layout>
            {user ? (
                <div className="container min-vh-100">
                    <div className="mx-3 d-flex flex-column justify-content-center">
                        <div className="my-3 d-flex flex-row justify-content-center">
                            <h1>Monthly View Performance</h1>
                        </div>
                        <h3 className="mx-auto">Showing monthly data from: </h3>
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
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Views per month line chart")}>Views per month</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Monthly Data table")}>Monthly Data</button>
                            <button className="btn bg-info-subtle shadow-sm" onClick={() => setDataView("Export")}>Export by month</button>
                        </div>
                        {dataView === "Monthly Data table" &&
                            <div className="d-flex flex-column justify-content-center">
                                <div className="d-flex flex-row justify-content-center">
                                    <CustomDatePicker 
                                        startDate={startDate} 
                                        setStartDate={setStartDate} 
                                        endDate={endDate} 
                                        setEndDate={setEndDate} 
                                        viewsList={['year', 'month']}
                                    />
                                </div>
                                <TableContainer component={Paper} elevation={3}>
                                    <Table aria-label="Monthly Data table">
                                        <TableHead>
                                            <TableRow className="bg-info-subtle">
                                                <TableCell align="center">
                                                    <TableSortLabel 
                                                        active={orderBy === "month"}
                                                        direction={orderBy === "month" ? order : "asc"}
                                                        onClick={() => handleTableSort("month")}
                                                    >
                                                        Month
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
                                                        active={orderBy === "finished_views"}
                                                        direction={orderBy === "finished_views" ? order : "desc"}
                                                        onClick={() => handleTableSort("finished_views")}
                                                    >
                                                        Finished Views
                                                    </TableSortLabel> 
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TableSortLabel 
                                                        active={orderBy === "retention_rate"}
                                                        direction={orderBy === "retention_rate" ? order : "desc"}
                                                        onClick={() => handleTableSort("retention_rate")}
                                                    >
                                                        Retention Rate
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TableSortLabel 
                                                        active={orderBy === "passed_views"}
                                                        direction={orderBy === "passed_views" ? order : "desc"}
                                                        onClick={() => handleTableSort("passed_views")}
                                                    >
                                                        Passed Views
                                                    </TableSortLabel> 
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TableSortLabel 
                                                        active={orderBy === "failed_views"}
                                                        direction={orderBy === "failed_views" ? order : "desc"}
                                                        onClick={() => handleTableSort("failed_views")}
                                                    >
                                                        Failed Views
                                                    </TableSortLabel> 
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TableSortLabel 
                                                        active={orderBy === "unfinished_views"}
                                                        direction={orderBy === "unfinished_views" ? order : "desc"}
                                                        onClick={() => handleTableSort("unfinished_views")}
                                                    >
                                                        Unfinished Views
                                                    </TableSortLabel> 
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TableSortLabel 
                                                        active={orderBy === "pass_rate"}
                                                        direction={orderBy === "pass_rate" ? order : "desc"}
                                                        onClick={() => handleTableSort("pass_rate")}
                                                    >
                                                        Pass Rate
                                                    </TableSortLabel> 
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {[...filteredMonthlyData].sort(getTableComparator(order, orderBy))
                                                .slice(pageNum*rowsPerPage, pageNum*rowsPerPage + rowsPerPage)
                                                .map(monthData => (
                                                <TableRow key={`${monthData.video.video_id}_${monthData.month}`}>
                                                    <TableCell className="border" align="center">{monthData.month.format("MMM YYYY")}</TableCell>
                                                    <TableCell className="border" align="right">
                                                        {monthData.started_views?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="border" align="right">
                                                        {monthData.finished_views?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="border" align="right">
                                                        {monthData.retention_rate}%
                                                    </TableCell>
                                                    <TableCell className="border" align="right">
                                                        {monthData.passed_views?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="border" align="right">
                                                        {monthData.failed_views?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="border" align="right">
                                                        {monthData.unfinished_views?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="border" align="right">
                                                        {monthData.pass_rate}%
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <TablePagination
                                        rowsPerPageOptions={[5, 10, 25, 50]}
                                        component="div"
                                        count={monthlyData.length}
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
                        } {dataView === "Views per month line chart" &&
                            <div className="d-flex flex-column justify-content-center">
                                <div className="d-flex flex-row justify-content-center">
                                    <CustomDatePicker 
                                        startDate={startDate} 
                                        setStartDate={setStartDate} 
                                        endDate={endDate} 
                                        setEndDate={setEndDate} 
                                        viewsList={['year', 'month']}
                                    />
                                </div>
                                <FormGroup className="d-flex flex-row justify-content-around">
                                    <FormControlLabel
                                        control={
                                        <Checkbox checked={lineChartVisible.started}  onChange={() => toggleLineChartVisible('started')}/>
                                        }
                                        label="Started"
                                    />
                                    <FormControlLabel
                                        control={
                                        <Checkbox checked={lineChartVisible.finished} onChange={() => toggleLineChartVisible('finished')}/>
                                        }
                                        label="Finished"
                                    />
                                    <FormControlLabel
                                        control={
                                        <Checkbox checked={lineChartVisible.passed} onChange={() => toggleLineChartVisible('passed')}/>
                                        }
                                        label="Passed"
                                    />
                                    <FormControlLabel
                                        control={
                                        <Checkbox checked={lineChartVisible.failed} onChange={() => toggleLineChartVisible('failed')}/>
                                        }
                                        label="Failed"
                                    />
                                    <FormControlLabel
                                        control={
                                        <Checkbox checked={lineChartVisible.unfinished} onChange={() => toggleLineChartVisible('unfinished')}/>
                                        }
                                        label="Unfinished"
                                    />
                                </FormGroup>
                                {filteredMonthlyData.length > 0 ? (
                                    <LineChart 
                                        xAxis={[{scaleType:'point', data:lineChartMonths}]}
                                        series={[
                                            lineChartVisible.started && {data:lineChartStartedViews, label:'Started Views', color:"dodgerblue", showMark:false},
                                            lineChartVisible.finished && {data:lineChartFinishedViews, label:'Finished Views', color:"orange", showMark:false},
                                            lineChartVisible.passed && {data:lineChartPassedViews, label:'Passed Views', color:"limegreen", showMark:false},
                                            lineChartVisible.failed && {data:lineChartFailedViews, label:'Failed Views', color:"red", showMark:false},
                                            lineChartVisible.unfinished && {data:lineChartUnfinishedViews, label:'Unfinished Views', color:"magenta", showMark:false}
                                        ].filter(Boolean)} // To filter out lines toggled off (false)
                                        height={400}
                                    />
                                ) : (
                                    <Paper className="mt-4 mx-auto d-flex flex-row flex-wrap justify-content-center rounded-5 p-3" elevation={2}>
                                        <HighlightOffIcon className="mx-2"/>
                                        <h5>No interaction data to display</h5>
                                    </Paper>
                                )}
                            </div>
                        } {dataView === "Export" &&
                            <div className="d-flex flex-column justify-content-center">
                                <DatePicker className="mx-auto my-3 shadow-sm" label="Month to export" 
                                    views={['year', 'month']}
                                    value={exportDate}
                                    onChange={date => setExportDate(date)} 
                                    disableFuture
                                    minDate={dayjs('2000-01-01')}
                                    maxDate={dayjs()}
                                />
                                <div className="d-flex flex-row justify-content-around my-3 mx-auto flex-wrap">
                                    <button className="mx-2 p-3 btn bg-info-subtle" onClick={() => handleExport(exportDate.format("YYYY-MM"), "filter")}>Export (excluding not yet created videos)</button>
                                    <button className="mx-2 p-3 btn bg-info-subtle" onClick={() => handleExport(exportDate.format("YYYY-MM"), "all")}>Export All</button>
                                </div>
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

export default MonthlyView;