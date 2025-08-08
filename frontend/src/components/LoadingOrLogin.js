import { ThreeDots } from 'react-loading-icons';

function LoadingOrLogin({ loadingLogin }) {
    return (
        <div className="my-3 d-flex flex-column text-center justify-content-center">
            {loadingLogin ? (
                <>
                    <h5>Loading...</h5>
                    <ThreeDots className="mx-auto my-2" stroke="#0bb5d8" speed={1} width={150}/>
                </>
            ) : (
                <h4>You must be logged in to view this page.</h4>
            )}
        </div>
    )
}

export default LoadingOrLogin;