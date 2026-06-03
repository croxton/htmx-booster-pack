const media = (requirement) => {
    return new Promise(resolve => {
        const queryStart = requirement.indexOf('(');
        if (queryStart === -1) {
            resolve();
            return;
        }
        const query = requirement.slice(queryStart).trim();
        const mediaQuery = window.matchMedia(query);
        if (mediaQuery.matches) {
            resolve();
        } else {
            const onChange = (event) => {
                if (event.matches) {
                    mediaQuery.removeEventListener('change', onChange);
                    resolve();
                }
            };

            mediaQuery.addEventListener('change', onChange);
        }
    });
};

export default media;