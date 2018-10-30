console.log("Scripts::Running core script exo_helpers.js");

/**
 * Usage: <b>PressCommandBase.java</b><br/>
 * <code>exoutils.triggerEvent(exoutils.$('%s'), 'keyup', 13);</code><br/>
 * Usage: <b>PressCommandBase.java</b><br/>
 * <code>exoutils.isDisabled(targetButton) && app && app.onGenericBooleanResult(false, %s);</code>
 * @constructor empty
 */
function ExoUtils() {
    this.isComponentDisabled = function(element) {
        var el = element;
        if (Utils.isSelector(element)) {
            el = Utils.$(element);
        }
        var hasClass = Utils.hasClass(el, this.disabledClass);
        console.log("ExoUtils.isDisabled: " + element + " " + hasClass);
        return hasClass;
    };

    this.isComponentHidden = function(element) {
        var el = element;
        if (Utils.isSelector(element)) {
            el = Utils.$(element);
        }
        var hasClass = Utils.hasClass(el, this.hiddenClass);
        console.log("ExoUtils.isHidden: " + element + " " + hasClass);
        return hasClass;
    };

    // events order:
    // emptied
    // loadstart
    // loadedmetadata
    // loadeddata (first frame of the video has been loaded)
    // playing
    this.preparePlayer = function() {
        var player = Utils.$('video');
        if (!player || this.preparePlayerDone)
            return;

        Utils.overrideProp2(player, 'volume', 0);

        // we can't pause video because history will not work
        function onLoad() {
            console.log('ExoUtils: video has been loaded into webview... force start playback');
            // msg 4 future me
            // 'paused' video won't invoke history update
            // don't call pause!!! or video remains paused event after play
            player.play();
        }

        // once player is created it will be reused by other videos
        // 'loadeddata' is first event when video can be muted
        player.addEventListener(DefaultEvents.PLAYER_DATA_LOADED, onLoad, false);

        this.preparePlayerDone = true;
    };

    this.getVideoDate = function() {
        var element = Utils.$(this.uploadDate);
        if (element != null) {
            // don't rely on : symbol parsing here! because it depends on localization
            return element.innerHTML;
        }

        element = Utils.$(this.videoDetails);
        if (element != null) {
            var parts = element.innerHTML.split('•');
            if (parts.length == 3) {
                return parts[2].trim();
            }
        }

        return "";
    };

    /**
     * Hide player in case it is visible
     */
    this.hidePlayerUi = function() {
        var controls = Utils.$(this.playerControlsSelector);
        if (!Utils.hasClass(controls, this.hiddenClass)) {
            EventUtils.triggerEvent(this.eventRootSelector, DefaultEvents.KEY_UP, DefaultKeys.ESC);
        }
    };

    // supply selector list
    this.getButtonStates = function() {
        this.preparePlayer();
        new SuggestionsWatcher(null); // init watcher

        YouButton.resetCache(); // activity just started

        var states = {};

        // NOTE: we can't delay here so process in reverse order
        var reversedKeys = Object.keys(PlayerActivityMapping).reverse();

        for (var idx in reversedKeys) {
            var key = reversedKeys[idx];
            var selector = PlayerActivityMapping[key];
            var btn = YouButton.fromSelector(selector);
            var newName = PlayerActivity[key];
            var isChecked = btn.getChecked();
            if (isChecked === null) // exclude disabled buttons from result
                continue;
            states[newName] = isChecked;
        }

        states[PlayerActivity.VIDEO_DATE] = this.getVideoDate();

        // don't let app to close video player (see ActionsReceiver.java)
        if (window.lastButtonName && window.lastButtonName == PlayerActivity.TRACK_ENDED) {
            states[PlayerActivity.BUTTON_NEXT] = null;
        }

        console.log("ExoUtils.getButtonStates: " + JSON.stringify(states));

        return states;
    };

    this.syncButtons = function(states) {
        this.preparePlayer();
        new SuggestionsWatcher(null); // init watcher

        window.lastButtonName = null;

        YouButton.resetCache(); // activity just started
        console.log("ExoUtils.syncButtons: " + JSON.stringify(states));

        for (var key in PlayerActivity) {
            var btnId = PlayerActivity[key];
            var isChecked = states[btnId];
            if (isChecked == undefined) // button gone, removed etc..
                continue;
            var selector = PlayerActivityMapping[key];
            var btn = YouButton.fromSelector(selector);
            btn.setChecked(isChecked);
        }
    };

    this.sendAction = function(action) {
        // code that sends string constant to activity
        if (app && app.onGenericStringResult) {
            app.onGenericStringResult(action);
        } else {
            console.log('ExoUtils: app not found');
        }
    };
}

ExoUtils.prototype = new ExoConstants();

// if you intend to remove this var don't forget to do the same inside GetButtonStatesCommand and SyncButtonsCommand classes
window.exoutils = new ExoUtils();