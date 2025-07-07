import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs from "dayjs";

function CustomDatePicker({ startDate, setStartDate, endDate, setEndDate, viewsList }) {
    return (
        <div className="my-3 d-flex flex-row justify-content-around">
            <DatePicker className="mx-1 shadow-sm" label="Start date" 
                views={viewsList}
                value={startDate} 
                onChange={date => setStartDate(date)} 
                disableFuture
                minDate={dayjs('2000-01-01')}
                maxDate={endDate}
            />
            <DatePicker className="mx-1 shadow-sm" label="End date" 
                views={viewsList}
                value={endDate} 
                onChange={date => setEndDate(date)} 
                disableFuture
                minDate={startDate}
                maxDate={dayjs()}
            />
        </div>
    )
}

export default CustomDatePicker