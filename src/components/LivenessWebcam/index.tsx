import React, { useCallback, useEffect, useState } from 'react'
import Webcam from 'react-webcam';
import { Camera } from '@mediapipe/camera_utils'
import FaceDetection from '@mediapipe/face_detection'
import { CameraOptions, useFaceDetection } from 'react-use-face-detection'
import './styles.scss'
import sleep from '../../utils/sleep'

const LivenessWebcam: React.FC = () => {

    const [isCapturing, setIsCapturing] = useState(false)
    const [pictureData, setPictureData] = useState<string | null>(null)
    const [isFaceCloseEnough, setIsFaceCloseEnough] = useState(false)
    const [isFaceCentered, setIsFaceCentered] = useState(false)

    const size = 100;
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

    const capturePicture = useCallback(async () => {
        setIsCapturing(true)

        if(!!(webcamRef as any).current){
            await sleep(2000)

            if(detected && isFaceCloseEnough && isFaceCentered){
                const picture = (webcamRef as any).current.getScreenshot()
                setPictureData(picture)
            }else{
                alert('Por favor, alinhe o seu rosto com a moldura novamente!')
            }
        }

        setIsCapturing(false)
    }, [webcamRef, detected, isFaceCloseEnough, isFaceCentered])

    useEffect(() => {
        if(!pictureData && !isCapturing && detected && isFaceCloseEnough && isFaceCentered){
            capturePicture()
        }
    }, [capturePicture, pictureData, isCapturing, detected, isFaceCloseEnough, isFaceCentered])

    useEffect(() => {
        const faceCenter =
            detected &&
            boundingBox.some((box) =>
                Math.abs(box.xCenter - 0.5) <= MAX_CENTER_OFFSET &&
                Math.abs(box.yCenter - 0.5) <= MAX_CENTER_OFFSET
            )

        const faceClose =
            detected &&
            boundingBox.some((box) => box.width >= MIN_BOX_SIZE && box.height >= MIN_BOX_SIZE)

        setIsFaceCloseEnough(faceClose)
        setIsFaceCentered(faceCenter)
    }, [detected, boundingBox, setIsFaceCloseEnough, setIsFaceCentered])

    return(

        <>
            <div id = "liveness-wrapper">
                {SHOW_LOADING && <div id = "loading">Carregando...</div>}
                {SHOW_DATA && (
                    <div id = "liveness-result-container">
                        <img src = {pictureData} alt = "Foto capturada" />

                        <button
                            onClick = {() => setPictureData(null)}
                        >Tirar novamente</button>
                        <button
                        
                        >Enviar agora</button>
                    </div>
                )}
                {true && (
                    <>
                        <div
                            id = "webcam-container"
                            style = {{ display: SHOW_DATA ? 'none' : 'flex' }}
                            className = {`status ${(detected && isFaceCloseEnough && isFaceCentered) ? 'success' : 'error'}`}
                            // style = {{ width, height }}
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
                                {facesDetected > 1 && (
                                    <span>Por favor, mantenha apenas um rosto na tela</span>
                                )}
                                {!detected && (
                                    <span>Por favor, alinhe o seu rosto com a moldura</span>
                                )}
                                {(facesDetected === 1 && detected) && (
                                    <>
                                        {(!isFaceCloseEnough) && (
                                            <span>Por favor, aproxime o seu rosto</span>
                                        )}
                                        {(isFaceCloseEnough && !isFaceCentered) && (
                                            <span>Por favor, centralize o seu rosto</span>
                                        )}
                                        {(isFaceCloseEnough && isFaceCentered) && (
                                            <span>Aguarde, estamos tirando a sua foto...</span>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>

    )

}

export default LivenessWebcam