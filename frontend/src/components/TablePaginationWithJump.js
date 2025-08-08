import { useState } from 'react';
import { IconButton, Box, TextField, useTheme } from '@mui/material';
import { FirstPage, KeyboardArrowLeft, KeyboardArrowRight, LastPage } from '@mui/icons-material';

function TablePaginationWithJump({ count, page, rowsPerPage, onPageChange }) {
    const theme = useTheme();
    const [jumpPageInput, setJumpPageInput] = useState('');

    const totalPages = Math.ceil(count / rowsPerPage);

    const handleJump = () => {
        const pageNum = parseInt(jumpPageInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(null, pageNum - 1); // Pagination is 0-indexed so minus one
        }else if (!isNaN(pageNum) && pageNum >= 1 && pageNum > totalPages) {
            onPageChange(null, totalPages - 1);
            setJumpPageInput(totalPages);
        }else if (!isNaN(pageNum) && pageNum < 1 && pageNum <= totalPages) {
            onPageChange(null, 0);
            setJumpPageInput(1);
        }
    };

    return (
        <Box className="d-flex flex-row align-items-center">
            <TextField
                className='mx-4 mb-4'
                size="small"
                type="number"
                label="Go to page"
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                variant='standard'
                style={{ width: 90 }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleJump();
                    }
                }}
            />
            <IconButton
                onClick={(event) => onPageChange(event, 0)}
                disabled={page === 0}
                aria-label="first page"
            >
                {theme.direction === 'rtl' ? <LastPage /> : <FirstPage />}
            </IconButton>
            <IconButton
                onClick={(event) => onPageChange(event, page - 1)}
                disabled={page === 0}
                aria-label="previous page"
            >
                <KeyboardArrowLeft />
            </IconButton>
            <IconButton
                onClick={(event) => onPageChange(event, page + 1)}
                disabled={page >= totalPages - 1}
                aria-label="next page"
            >
                <KeyboardArrowRight />
            </IconButton>
            <IconButton
                onClick={(event) => onPageChange(event, totalPages - 1)}
                disabled={page >= totalPages - 1}
                aria-label="last page"
            >
                {theme.direction === 'rtl' ? <FirstPage /> : <LastPage />}
            </IconButton>
        </Box>
    );
}

export default TablePaginationWithJump;
