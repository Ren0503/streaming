import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router';

import { TrackList } from 'components/track';
import { PageBanner, Loading, PlayListFunctions } from 'components/shared';

import useId from 'hooks/useId';
import useInfiniteScroll from 'hooks/useInfiniteScroll';
import putWithToken from 'services/putWithToken';
import makeAxiosRequest from 'services/makeAxiosRequest';
import { TokenContext, MessageContext, PlayContext } from 'context';

function useHighlight() {
    return new URLSearchParams(useLocation().search).get('highlight');
};

export default function AlbumScreen() {
    const id = useId();
    const token = useContext(TokenContext);
    const setMessage = useContext(MessageContext);
    const updatePlayer = useContext(PlayContext);
    const [loading, setLoading] = useState(true);

    const highlight = useHighlight();

    const [bannerInfo, setBannerInfo] = useState({
        album_type: '',
        name: '',
        description: '',
        user: [],
        followers: 0,
        primary_color: '#262626',
        images: [],
        release_date: ''
    });
    const [tracks, setTracks] = useState([]);
    const [uri, setUri] = useState('');
    const [setNext, lastRef] = useInfiniteScroll(setTracks);
    const source = axios.CancelToken.source();

    useEffect(() => {
        setTracks([]);
        setNext(null);
        setBannerInfo({
            album_type: '',
            name: '',
            description: '',
            user: [],
            followers: 0,
            primary_color: '#262626',
            images: [],
            release_date: ''
        });
        setUri('');
        setLoading(true);

        const [source, makeRequest] = makeAxiosRequest(`https://api.spotify.com/v1/albums/${id}`);
        if (id) {
            makeRequest()
                .then((data) => {
                    const { album_type, name, artists, primary_color, tracks, images, release_date, uri } = data;
                    setBannerInfo(bannerInfo => ({ ...bannerInfo, album_type, name, user: artists, primary_color, images, release_date }));
                    setTracks(tracks.items);
                    setNext(tracks.next);
                    setUri(uri);
                    setLoading(false);
                })
                .catch((error) => {
                    setLoading(false)
                    setMessage(`ERROR: ${error}`)
                })
        }
        return () => source.cancel();
    }, [id]);

    const playContext = () => {
        const body = { context_uri: uri };
        const request = putWithToken(`https://api.spotify.com/v1/me/player/play`, token, source, body);
        request()
            .then(response => {
                if (response.status === 204) {
                    setTimeout(() => updatePlayer(), 500);
                } else {
                    setMessage(`ERROR: Something went wrong! Server response: ${response.status}`);
                }
            })
            .catch(error => setMessage(`ERROR: ${error}`))
    }

    const playContextTrack = (trackUri) => {
        const body = {
            context_uri: uri,
            offset: { uri: trackUri }
        }
        const request = putWithToken(`https://api.spotify.com/v1/me/player/play`, token, source, body);
        request()
            .then(response => {
                if (response.status === 204) {
                    setTimeout(() => updatePlayer(), 500);
                } else {
                    setMessage(`ERROR: Something went wrong! Server response: ${response.status}`);
                }
            })
            .catch(error => setMessage(`ERROR: ${error}`))
    }

    return (
        loading
            ? <Loading />
            : <div className="listPage" style={{ display: `${tracks.length === 0 ? 'none' : 'block'}` }}>
                <PageBanner pageTitle={bannerInfo.album_type} bannerInfo={bannerInfo} />
                <div className="playListContent">
                    <div className="playListOverlay" style={{ backgroundColor: `${bannerInfo.primary_color}` }}></div>
                    <PlayListFunctions setMessage={setMessage} playContext={playContext} onFollow={() => setMessage('Oops looks like the Spotify API does not support following albums')} />
                    <div className="page-content">
                        <TrackList ref={lastRef} tracks={tracks} highlight={highlight} playContextTrack={playContextTrack} />
                    </div>
                </div>
            </div>
    );
};
