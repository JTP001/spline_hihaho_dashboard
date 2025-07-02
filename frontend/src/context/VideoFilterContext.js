import { createContext, useContext, useState } from "react";

const VideoFilterContext = createContext();

export function VideoFilterProvider({ children }) {
    const [videoFilter, setVideoFilter] = useState(null);

    return (
        <VideoFilterContext.Provider value={{ videoFilter, setVideoFilter }}>
            {children}
        </VideoFilterContext.Provider>
    );
}

export function useVideoFilter() {
    return useContext(VideoFilterContext);
}