import React, { useEffect, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera } from '@mediapipe/camera_utils'
import FaceDetection from '@mediapipe/face_detection'
import { CameraOptions, useFaceDetection } from 'react-use-face-detection'
import './styles.scss'

const LivenessWebcam: React.FC = () => {

    const [pictureData, setPictureData] = useState<string | null>(null)
    const [isFaceCloseEnough, setIsFaceCloseEnough] = useState(false)
    const [isFaceCentered, setIsFaceCentered] = useState(false)
    const [timerActive, setTimerActive] = useState(false)
    const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null)
    const [countdown, setCountdown] = useState<number | null>(null)

    const size = 100
    const width = 3 * size
    const height = 4 * size

    const MIN_BOX_SIZE = 0.5
    const MAX_CENTER_OFFSET = 0.4

    const { webcamRef, boundingBox, isLoading, detected, facesDetected } = useFaceDetection({
        faceDetectionOptions: {
            model: 'short',
        },
        faceDetection: new FaceDetection.FaceDetection({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        }),
        camera: ({ mediaSrc, onFrame }: CameraOptions) =>
            new Camera(mediaSrc, {
                onFrame,
                width,
                height,
                facingMode: 'user',
            }),
    })

    const SHOW_LOADING = isLoading
    const SHOW_DATA = !!pictureData

    const startCaptureTimer = useCallback(() => {
        setTimerActive(true)

        setCountdown(3)

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev !== null && prev > 1) {
                    return prev - 1
                } else {
                    clearInterval(interval)
                    return null
                }
            })
        }, 1000)

        const timer = setTimeout(() => {
            if(detected && isFaceCloseEnough && isFaceCentered) {
                const picture = (webcamRef as any).current?.getScreenshot()

                if(picture) setPictureData(picture)
            }else{
                alert('Por favor, alinhe o seu rosto com a moldura novamente!')
            }

            setTimerActive(false)
        }, 3000)

        setTimerId(timer)
    }, [detected, isFaceCloseEnough, isFaceCentered, webcamRef])

    const stopCaptureTimer = useCallback(() => {
        if(timerId){
            clearTimeout(timerId)
            setTimerId(null)
        }

        setTimerActive(false)
        setCountdown(null)
    }, [timerId]);

    useEffect(() => {
        if(!pictureData && detected && isFaceCloseEnough && isFaceCentered && !timerActive){
            startCaptureTimer()
        }else if(!detected || !isFaceCloseEnough || !isFaceCentered){
            if(timerActive){
                stopCaptureTimer()
            }
        }
    }, [detected, isFaceCloseEnough, isFaceCentered, pictureData, timerActive, startCaptureTimer, stopCaptureTimer]);

    useEffect(() => {
        if(boundingBox.length > 0){
            const largestFace = boundingBox.reduce((prev, current) =>
                prev.width * prev.height > current.width * current.height ? prev : current
            )

            const faceCenter =
                Math.abs(largestFace.xCenter - 0.5) <= MAX_CENTER_OFFSET &&
                Math.abs(largestFace.yCenter - 0.5) <= MAX_CENTER_OFFSET

            const faceClose =
                largestFace.width >= MIN_BOX_SIZE && largestFace.height >= MIN_BOX_SIZE

            setIsFaceCloseEnough(faceClose)
            setIsFaceCentered(faceCenter)
        }else{
            setIsFaceCloseEnough(false)
            setIsFaceCentered(false)
        }
    }, [boundingBox])

    return(

        <div id = "liveness-wrapper">
            {SHOW_LOADING && <div id = "loading">Carregando...</div>}
            {SHOW_DATA && (
                <div id = "liveness-result-container">
                    <img src = {pictureData} alt = "Foto capturada" />
                    <button onClick = {() => setPictureData(null)}>Tirar novamente</button>
                    <button>Enviar agora</button>
                </div>
            )}

            <>
                <div
                    id = "webcam-container"
                    className = {`status ${detected ? isFaceCloseEnough && isFaceCentered ? 'success' : 'warning' : 'error'}`}
                    style = {{ display: SHOW_DATA ? 'none' : 'flex' }}
                >
                    {boundingBox.map((box, index) => (
                        <div
                            key = {index}
                            id = "face-recognition-overlay"
                            style = {{
                                top: `${box.yCenter * 100}%`,
                                left: `${box.xCenter * 100}%`,
                                width: `${box.width * 100}%`,
                                height: `${box.height * 100}%`,
                            }}
                        />
                    ))}
                    <Webcam
                        ref = {webcamRef}
                        forceScreenshotSourceSize
                        screenshotFormat = "image/jpeg"
                        style = {{
                            height,
                            width,
                            position: 'absolute',
                        }}
                    />
                </div>

                {!SHOW_DATA && (
                    <div id = "liveness-instructions-container">
                        {facesDetected > 1 && <span>Por favor, mantenha apenas um rosto na tela</span>}
                        {!detected && <span>Por favor, alinhe o seu rosto com a moldura</span>}
                        {(facesDetected === 1 && detected) && (
                            <>
                                {!isFaceCloseEnough && <span>Por favor, aproxime o seu rosto</span>}
                                {(isFaceCloseEnough && !isFaceCentered) && (
                                    <span>Por favor, centralize o seu rosto</span>
                                )}
                                {(isFaceCloseEnough && isFaceCentered) && (
                                    <span>
                                        {(timerActive && countdown !== null) ? (
                                            `Captura em ${countdown}...`
                                        ) : (
                                            'Aguarde, estamos tirando a sua foto...'
                                        )}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                )}
            </>
        </div>

    )
}

export default LivenessWebcam;