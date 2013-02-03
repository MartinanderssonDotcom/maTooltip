// ----------------------------------------------------------------------------------------------------------
// IMPORTANT!! If you're new to this library, consider studying the complementary web site www.matooltip.com
//             first before trying to make sense out of this source code. The site will give you much needed
//             feedback on the external API and how to use this module. The comments in this source code are
//             only aimed towards coders interested in modifying the source code or have a read for their own
//             intellectual well being.
//
// Version:     1.0.0
// Last update: 2013-02-02
// Signature:   Martin Andersson (webmaster@martinandersson.com)
// ----------------------------------------------------------------------------------------------------------

/*
 * TODO: Implement check to see if the tooltip is visible, if not; call for attention by scrolling?
 *       See page 394 in "JavaScript: The definitive guide".
 *       
 * TODO: Implement optional data attribute parsing from HTML doc at document ready.
 * 
 * TODO: Unit tests!
 */


if (!maTooltip)
var maTooltip = (function ()
{
    // Aliasing maTooltip & jQuery
    var m = maTooltip;
    var $ = jQuery ? jQuery : function () { throw new Error('maTooltip REQUIRES jQuery. Goto www.jquery.com and read more.'); } ;
    
    
    /**
     * STATIC "CONSTS" AND METHODS:
     * ----------------------------
     */
    
    
    //
    // Constants used to specify where, relative to the target element, tooltiper will finalize his position.
    //
    m.POSITION = {
            LEFT: 'LEFT',
            TOP: 'TOP',
            RIGHT: 'RIGHT',
            BOTTOM: 'BOTTOM'
            };
    
    
    //
    // Just to offer newbies a convenient way of not having to think for themselves.
    // I kinda didn't think for myself either as these values are copied from jQuery.
    //
    m.SPEED = {
            FAST: 200,
            SLOW: 600
            };
    
    m.VISIBILITY = {
            HOVER: -3,
            AUTO: -2,
            FOREVER: -1
    };
    
    
    
    
    /*
     * This variable will store handles to all created objects (the constructor and the "quick" factory method
     * will both return the handle). The name of the property in .INSTANCES will be set according to this priority:
     * 
     *     1. If ID attribute of the target element is available, use it. If ID already exist, god forbid,
     *        append the serial prefixed with an underscore.
     *     2. If the NAME attribute is available, use it. If NAME already exists, append the serial, again
     *        prefixed with an underscore.
     *     3. ID nor Name exists? Name this tooltiper '_ANONYMOUS'. And yes, append underscore + serial if
     *        there's sill a naming conflict.
     * 
     * WTF is serial? A serial number used internally to track the number of created instances. Also, it might
     * be used in the process to store a handle as described above.
     */
    m.INSTANCES = {};
    
    
    /**
     * Factory method for displaying a quick tooltip.
     * @see constructor comments and reference.
     * 
     * @param {mixed} what_element           Forwarded to constructor.
     * @param {mixed} what_message           Also forwarded to constructor.
     * @param {object} optional_settings     Is optional. Message set here will override argument 'what_message'.
     */
    m.quickTooltip = function ( what_element, what_message, optional_settings )
    {
        var local_settings = {
                static_message: what_message
            };

        if (typeof optional_settings === 'object' && optional_settings !== null)
            $.extend(local_settings, optional_settings);
        
        local_settings.one_time_only = true;    // Must never be overwritten.
        
        var tooltip = new m(what_element, local_settings);

        tooltip.show();
        return tooltip;
    };
    
    
    /**
     * --> END STATIC "CONSTS" AND METHODS
     * 
     * PRIVATE VARIABLES:
     * ------------------
     */
    
    
    //
    // These are the hardcoded defaults, use at your own will, or override by providing neccessary parameters
    // to the constructor.
    //
    /**
     * @private
     * @see constructor comments and reference.
     */
    var _DEFAULTS = {
            position: m.POSITION.TOP,
            fade_in_duration: m.SPEED.FAST,
            move_in_duration: 100,
            move_in_from: 10,
            full_visibility_duration: -2,
            fade_out_duration: m.SPEED.SLOW,
            move_out_duration: 0,
            easing_in: 'swing',
            easing_out: 'linear',
            static_message: null,
            one_time_only: false,
            insert_before: 'body > *:first-child',
            calculated_time_offset: null,
            opacity: 0.8,                             // <-- Only a fall back value, will be overwritten in a minute if parsing of the stylesheet succeeds.
            
            /*
             * If you call .show() when the tooltiper is visible, AND the message supposed to display have changed, then the tooltiper will
             * flash/blink in order to request notice from webuser. Well.. dependent on this variable of course. Set to FALSE if you don't
             * want this transitional effect. NOTE that the flash or blink doesn't happen whatever this setting is set to, if the message hasn't
             * changed since the last call to .show().
             */
            flash_on_text_change: true
            };
    
    m.getDefaults = function () // <-- Ain't so much private anymore. Power users can use this method to set _DEFAULTS programmatically.
    {
        return _DEFAULTS;
    };
    
    //
    // Try to parse opacity from stylesheet file.
    //
    (function () {

        var reg = /matooltip.css/i;
            
        for (var ii = 0; ii < document.styleSheets.length; ++ii)
            {
            
            var ss = undefined;
            
            // First, try the title attribute.
            if (document.styleSheets[ii].title === 'maTooltip')
                ss = document.styleSheets[ii];
            
            else
                {
                // Fall back to a parse of href.
                var href = document.styleSheets[ii].href || "";
                if (href.length >= 13) // "maTooltip.css".length
                    {
                    // Then grab the last 13 (lastIndexOf could NOT be used 'cause it is case sensitive.)
                    var lastPart = href.substr(href.length - 13);
                    if (reg.test(lastPart))
                        ss = document.styleSheets[ii];
                    }
                }
            
            if (ss !== undefined)
                {
                // We've found the stylesheet. Now find the rule.
                var rules = ss.cssRules ? ss.cssRules : ss.rules; // IE uses .rules and not .cssRules.

                for(var kk = 0; kk < rules.length; ++kk)
                    {
                    var rule = rules[kk];
                    if (!rule.selectorText) continue; // "Skip @import and other nonstyle rules". See "JavaScript: The definitive guide", p. 442.
                    else if (rule.selectorText === '.maTooltip')
                        {
                        // k we've got the rule, get the opacity.
                         var _opacity = rule.style.opacity;
                         if (!isNaN(_opacity) && _opacity > 0 && _opacity <= 1) // Full opacity is allowed, not zero though. Dumb values like "1.1" will also be ignored.
                             _DEFAULTS.opacity = _opacity;                      // Upgrade value in store.

                         break; // Inner
                        }
                    }
                    break; // Outer
                }
            }
        
    }());
    
    
    /** @private */
    var _serial = 0; // Don't touch this. Used internally to track number of created instances.
    
    /** @private */
    var _ERROR_MESSAGE_PREFIX = 'maTooltip: '; // Will be prefixed any error message in an Error thrown.
    
    
    /**
     * --> END PRIVATE VARIABLES
     * 
     * CONSTRUCTOR:
     * ------------
     */
    
    
    /**
     * Constructor used for creating new tooltips.
     * 
     * @constructor
     * 
     * @param {mixed} element        A jQuery handle to the element that shall be the anchor point for the tooltip. Because
     *                               the element will be wrapped in a jQuery constructor call, you can pass a selector string.
     *                               In both cases, the jQuery handle must only contain exactly one element. Any other case
     *                               will produce a TypeError exception. maTooltip is no jQuery plugin but a regular JS module.
     * 
     * @param {object} settings      A map object with some settings as detailed below:
     * 
     *                                   .position:                 Anyone of the directions specified in maTooltip.POSITION.
     *                                                              
     *                                   .fade_in_duration:         If set, an integer value for the duration of the fade in animation
     *                                                              in ms. If value > 0, then a fade in animation will occur.
     *                                                              
     *                                   .fade_out_duration:        @see .fade_in.
     *                                                              
     *                                   .move_in_duration:         If set, integer value for the duration of a move-in animation in ms.
     *                                                              If value > 0, then the tooltiper will "move" into position.
     *                                                              
     *                                   .move_out_duration:        @see .move_in. But there is one difference! If move_out_duration === 0,
     *                                                              then the tooltiper will not have his position returned to move_in_from.
     *                                                              If move_in_duration === 0, then the tooltiper will not stay in
     *                                                              move_in_from, but will instantly be placed at the final position which
     *                                                              is goverened by .position.
     *                                                              
     *                                   .move_in_from:             If you set move_in_duration and move_out_duration to something above 0,
     *                                                              then you need to supply this variable too or accept default value
     *                                                              (currently 10 [px]).
     *                                                              
     *                                                              move_in_from can be a mapobject with .top and .left attribute set to
     *                                                              the position on screen that the tootip move in animation should start
     *                                                              from (and go back to in his move out animation).
     *                                                              
     *                                                              move_in_from can also be a float value between -1 and 1 (not including)
     *                                                              indicating how much from the opposite towards the final position the
     *                                                              animation shall start.
     *                                                              A value of +0.5 indicate the middle or center of the target element.
     *                                                              A value of 0 indicate a complete offset, thus a move in from the opposite
     *                                                              direction.
     *                                                              A value of 0.99 indicate almost the final position, offsetted by just
     *                                                              1 % of the total length.
     *                                                              All negative floats between 1 and 0 will work in the very same way, but
     *                                                              the offset will move outwards and not towards the target elements
     *                                                              center/middle.
     *                                                              
     *                                                              move_in_from can also be an integer value from 1 to infinity (or from
     *                                                              -1 and to negative infinity). This will be interpreted as a request to
     *                                                              offset starting position from the final position with this relative value
     *                                                              in pixels. Example, if current position === POSITION.TOP, and move_in_from
     *                                                              has a value of "5", then the tooltiper will move in from 5 px towards the
     *                                                              bottom of the screen. Positive numbers are always towards centre, negative
     *                                                              values are outwards.
     *                                                              
     *                                   .move_in_to:               Shouldn't be used, but whatever.
     *                                                              
     *                                   .full_visibility_duration: For how long to display before hiding again, in ms. If duration is set to
     *                                                              -1, then you as the programmer has to programmatically hide it again:
     *                                                              duration will otherwise be forever. If duration is set to -2, an algorithm
     *                                                              will decide the duration. See comments made locally in code. YES, duration
     *                                                              can be zero. If such is the case, you will only have the fade in and fade
     *                                                              out animations occur, for whatever the reason.
     *  
     *                                   .static_message:           If set, this is a fallback message used by maTooltip if no message are
     *                                                              provided in the call to the .show method. Except the almost obvious type
     *                                                              "string" that this value can be, static_message can also be a function or
     *                                                              even an object (obj.toString() will be called in the latter case).
     *                                                       
     *                                   .inline_style:             Give a style string and he shall be set as an style attribute of the
     *                                                              content div.
     *  
     *                                   .one_time_only:            Must be bool(true) or bool(false). Set to true if your intention is to
     *                                                              create a one time only tooltip that will never be used again. A one time
     *                                                              only tooltip will not have his handle saved in .INSTANCES, and once the
     *                                                              tooltiper is asked to hide himself, he will completely destroy the created
     *                                                              elements in the DOM. Otherwise, the elements would only have been detached.
     *                                                              Thus this is a way to promote both ease of use as well as letting the
     *                                                              JavaScript garbage collector kick in as early as possible. The handle will
     *                                                              be returned by the constructor, but you should only save it for a particular
     *                                                              use. Such as programmatically show/hide the tooltip. And once you've done
     *                                                              that, set reference to null.
     * 
     *                                   .insert_before:            If the corresponding property in ._DEFAULTS is set to null, this will cause
     *                                                              the tooltiper to be inserted just before the target element in the DOM tree.
     *                                                              The elements will only stay there when the tooltip is visible. You can
     *                                                              override this by supplying your own target element for whatever reason.
     *                                                      
     *                                   .calculated_time_offset:   Can be -=, +=, /=, or *=, and then an integer- or float value. This is used
     *                                                              to add or subtract and the like to internal algorithm who calculates time
     *                                                              to live for a tooltip if and only if .full_visibility_duration === -2.
     *                                                              Useful if you intend to dominate tooltiper's contents on your own. The
     *                                                              algorithm who calculates time to live only act upon how many words in plain
     *                                                              text the contents is made out of (to that sum it adds duration of fade- and
     *                                                              move-in animations). So, if you say have no more than one readable word in
     *                                                              the contents but five thousands images, then time to live would be given a
     *                                                              really short time (hey, one word right). With this setting, you can easily
     *                                                              add 2000 ms by setting this variable to '+=2000'.
     */
    function maTooltip( element, settings )
    {
        // Evaluate element and save handle
        this.$ = _demandOneElement.call(this, element, 'Element sent to Constructor'); // Throws TypeError.

        _parseSettings.call(this, settings);
        _createDOM.call(this);
        
        /*
         * Internal callback arrays
         */
        this._animCompleteCallbacks = {
                fadein: [],
                fadeout: [],
                movein: [],
                moveout: []
        };

        // Init state = no animation occurs.
        
        this.IsInFadeInAnimation = false;
        this.IsInMoveInAnimation = false;
        
        this.IsInFadeOutAnimation = false;
        this.IsInMoveOutAnimation = false;
        
        // Last message shown will be stored here.
        this.LastMessageText = '';
        
        // ..also the calculated time or duration of the visibility.
        this.LastMessageDuration = null;
        
        /*
         * Setting up handlers.
         */
        
        var self = this;
        this._windowResizeHandler = function () { self.positionMightBeDirty(); };
        
        var $window = $(window);
        $window.on('resize.maTooltip', self._windowResizeHandler); // Window resize
        $window.one('load.maTooltip', function () { if(self.DOM) self.positionMightBeDirty(); });   // Run just once when document has fully finished loading (fonts etc. will move elements on screen) Note the if clause, .dispose might have been called before this event takes place!

        // Mouseenter- and leave handlers.
        if (this.SETTINGS.full_visibility_duration === -3)
            {
            // EXPERIMENTAL FUNCTION TO FOUND OUT IF MOUSE REALLY IS OVER ELEMENT
            /*function isMouseOver(e)
                {
                var dp = this.getDimensionsAndPositions();
                
                var pageY = e.pageY;
                var pageX = e.pageX;
                
               /* $(document).one('mousemove.maTooltip', function (e)
                        {
                        pageY = e.pageY;
                        pageX = e.pageX;
                        });
                    
                // chaining the call to .trigger above won't work: http://stackoverflow.com/questions/7772222/is-there-a-way-to-trigger-mousemove-and-get-event-pagex-event-pagey
                $(window).trigger('mousemove.maTooltip');*/
                
                /*if (pageY === undefined)
                    throw "UNDEFINED!";
                
                if (pageY >= dp.targetElemOffset.top && pageY <= (dp.targetElemOffset.top + dp.targetElemHeight))
                    if (pageX >= dp.targetElemOffset.left && pageX <= (dp.targetElemOffset.left + dp.targetElemWidth))
                        {
                        return true;
                        }
                return false;
                }*/
            this.$.on({
                'mouseenter.maTooltip': function (e) {
                    
                        _animCompleteCallbackRemove.call(self, 'fadein');
                        _animCompleteCallbackRemove.call(self, 'movein');
                        
                        self.show();
                    },
                'mouseleave.maTooltip': function (e) {
                    
                    // Special case, we shall always let the tooltip become fully visible before doing a call to .hide
                    if (self.IsInFadeInAnimation || self.IsInMoveInAnimation)
                        {
                        if (self.SETTINGS.move_in_duration >= self.SETTINGS.fade_in_duration)
                            _animCompleteCallbackAdd.call(self, 'movein', function () { self.hide(); });
                        else
                            _animCompleteCallbackAdd.call(self, 'fadein', function () { self.hide(); });
                        return;
                        }
                    
                    // No early exit and no mouse over, call .hide:
                    self.hide();
                    }
                });
            }
        
        ++_serial;

        // Define name
        var name_id_or_serial =  this.$.attr("id") || this.$.attr("name");

        if (name_id_or_serial === undefined)
            name_id_or_serial = '_ANONYMOUS';
        
        // If name already exist in .INSTANCES, extend name with underscore + serial.
        if (name_id_or_serial in m.INSTANCES)
            name_id_or_serial += '_' + _serial;

        // Save handle if not a one_time_only tooltiper
        if (!this.SETTINGS.one_time_only)
            m.INSTANCES[name_id_or_serial] = this;

        // Always store his name though.
        this.name = name_id_or_serial;

        // For clarification in code. These vars will be used by other functions.
        this.__timeoutID_hide = undefined;  // <-- id for a timed call to .hide().
    }



    /**
     * 
     * --> END CONSTRUCTOR
     * 
     * PRIVATE functions -->
     * ---------------------
     */


    /**
     * First parameter must be a jQuery handle or a string that will be passed to jQuery. In both cases,
     * the handle must only contain one element.
     * 
     * @param {mixed} jQuery_handle_or_selector      Target to be evaluated.
     * @param {mixed} optionalSourceIdentifier       Optional identifier that will be included in the error message
     *                                               of thrown TypeError. Be a string or whatever that can be used
     *                                               in a string expression.
     * 
     * @return {jQuery}                              Yes, if all went well.
     * @throws {TypeError}                           Yes, if validation fails.
     */
    function _demandOneElement( jQuery_handle_or_selector, optionalSourceIdentifier )
    {
        var j = $(jQuery_handle_or_selector);
        var error = undefined;

        if (j.length === 0)
            error = new TypeError(_ERROR_MESSAGE_PREFIX + 'No elements in the jQuery handle!');

        else if (j.length > 1)
            error = new TypeError(_ERROR_MESSAGE_PREFIX + 'Recieved ' + j.length + '" elements in the jQuery handle. Your intention?');

        if (error !== undefined && optionalSourceIdentifier !== undefined) // Object.prototype has a .toString method
            {
            error.message += '(Identifier: "' + optionalSourceIdentifier + '")';
            throw error;
            }

        return j;
    }

    /**
     * Validates and parses the settings object.
     * 
     * @param {object} settings      @see constructor
     * @throws {TypeError}           If a setting is set but not parsable.
     */
    function _parseSettings( settings )
    {
        settings = settings || {};  // Things will go from here..
        this.SETTINGS = {};         // ..to this place. Or fall back to defaults.
        var local_copy = undefined; // Best practices: Variables are hoisted. This var is used to hold local copies of a user sent setting to hinder any unfortunate modification.
        //
        // OPACITY
        //
        if ('opacity' in settings && settings.opacity >= 0 && settings.opacity <= 1)
            this.SETTINGS.opacity = settings.opacity;
        else
            this.SETTINGS.opacity = _DEFAULTS.opacity;
        //
        // POSITION
        //
        if ('position' in settings && typeof settings.position === 'string')
            {
            var upped = settings.position.toUpperCase();
            if (m.POSITION[upped])  // See that it's there first.
                this.SETTINGS.position = upped;
            else
                throw new TypeError(_ERROR_MESSAGE_PREFIX + 'Could not parse your .position setting!');
            }
        else
            this.SETTINGS.position = _DEFAULTS.position;
        //
        // Local helper function, used to eliminate redundancy in code.
        //
        function isNaN_aggressive( param, id )
        {
            local_copy = parseInt(param);
            if ( isNaN(local_copy) )
                throw new TypeError(_ERROR_MESSAGE_PREFIX + 'Could not parse your "' + id + '" argument!');
            
            return local_copy;
        }
        //
        // ALMOST ALL OF DURATIONS
        //
        var durations = ['fade_in_duration', 'fade_out_duration', 'move_in_duration', 'move_out_duration'];
        for (var i = 0; i < durations.length; ++i)
            {
            var setting = durations[i];

            this.SETTINGS[setting] = setting in settings? isNaN_aggressive(settings[setting], setting) : _DEFAULTS[setting];
            if (this.SETTINGS[setting] < 0)
                this.SETTINGS[setting] = 0;
            
            }
        //
        // FULL_VISIBILITY_DURATION
        //
        this.SETTINGS.full_visibility_duration = 'full_visibility_duration' in settings ? isNaN_aggressive(settings.full_visibility_duration, 'full_visibility_duration') : _DEFAULTS.full_visibility_duration;
        if (this.SETTINGS.full_visibility_duration < -3)
            throw new TypeError(_ERROR_MESSAGE_PREFIX + 'Full visibility duration "' + this.SETTINGS.full_visibility_duration + '" is not supported. Must be a value from -3 to infinity.');
        //
        // MOVE_IN_FROM
        //
        if (! ('move_in_from' in settings))
            this.SETTINGS.move_in_from = _DEFAULTS.move_in_from;
        else
            {
            if (settings.move_in_from === null || settings.move_in_from === undefined)
                this.SETTINGS.move_in_from = _DEFAULTS.move_in_from; // Assuming thus that this already contains a valid value.
            
            else if (typeof settings.move_in_from === 'object') // Already checked for null.
                {
                if ('top' in settings.move_in_from && 'left' in settings.move_in_from)
                    {
                    var o = {};
                    try
                    {
                        o.top = isNaN_aggressive(settings.move_in_from.top, 'move_in_from.top');
                        o.left = isNaN_aggressive(settings.move_in_from.left, 'move_in_from.left');
                        this.SETTINGS.move_in_from = o;
                    }
                    catch(e)
                    {
                        this.SETTINGS.move_in_from = _DEFAULTS.move_in_from;
                    }
                    
                    }
                else
                    this.SETTINGS.move_in_from = _DEFAULTS.move_in_from;
                }
                else if (typeof settings.move_in_from === 'number') // All numeric values are valid.
                    {
                    this.SETTINGS.move_in_from = settings.move_in_from;
                    }
                else
                    this.SETTINGS.move_in_from = _DEFAULTS.move_in_from;
            }
        //
        // MOVE_IN_TO
        //
        if ('move_in_to' in settings && settings.move_in_to.top && settings.move_in_to.left)
            this.SETTINGS.move_in_to = settings.move_in_to; // No parsing gets done here.
        else
            this.SETTINGS.move_in_to = null;
        //
        // STATIC_MESSAGE
        //     ..will not be evaluated at this stage. It will happen during runtime.
        //
        this.SETTINGS.static_message = 'static_message' in settings ? settings.static_message : _DEFAULTS.static_message;
        //
        // ONE_TIME_ONLY
        //
        this.SETTINGS.one_time_only = settings.one_time_only || _DEFAULTS.one_time_only;   // Anyone truthy is truthy, else false.
        //
        // INSERT_BEFORE
        //
        if ('insert_before' in settings)
            this.SETTINGS.insert_before = _demandOneElement.call(this, settings.insert_before, '\'insert_before\' in settings object');
        else if (_DEFAULTS.insert_before !== null)
            this.SETTINGS.insert_before = _DEFAULTS.insert_before;
        else
            this.SETTINGS.insert_before = this.$;   // null makes maTooltip insert the tooltip at the element in question.
        //
        // INLINE STYLE
        //
        if ('inline_style' in settings)
            this.SETTINGS.inline_style = settings.inline_style;
        else
            this.SETTINGS.inline_style = null;
        //
        // calculated_time_offset (parsed at runtime, here we only check that the syntax is correct)
        //
        if ('calculated_time_offset' in settings && typeof settings.calculated_time_offset === 'string' && settings.calculated_time_offset.length >= 3)
            {
            
            var firstTwo = settings.calculated_time_offset.substr(0, 2);
            var theRest = settings.calculated_time_offset.substr(2);
            
            // The empty switch.
            switch (firstTwo)
                {
                case '-=':
                    break;
                case '+=':
                    break;
                case '*=':
                    break;
                case '/=':
                    break;
                default:
                    throw new TypeError(_ERROR_MESSAGE_PREFIX + '"' + firstTwo + '" is not supported in the "calculated_time_offset" setting.');
                }
            
            if (isNaN(theRest))
                throw new TypeError(_ERROR_MESSAGE_PREFIX + '"' + theRest + '" is not a number in the supplied "calculated_time_offset" setting.');
            
            
            
            this.SETTINGS.calculated_time_offset = settings.calculated_time_offset;
            }
        
        else
            this.SETTINGS.calculated_time_offset = _DEFAULTS.calculated_time_offset;
        
    }

    
    /**
     * Executes a callable (with context = this tooltiper) or the .toString method of an object.
     * In whatever the case, a string is expected to be returned. If functor is a string, he will
     * be returned as such. If param in whatever the case, never evaluated to a string, this method
     * will return false.
     * 
     * @param {mixed} functor       Can be a function or a object or a string.
     * 
     * @return {mixed}              Returns the string the callable produced, or a string if string was passed as parameter.
     *                              If error, _executeFunctor shall gracefully return false.
     */
    function _executeFunctor( functor )
    {
        if (functor === null || functor === undefined)
            return false;

        var r = false;  // Will be returned. Assume false.

        // Make string if we're dealing with an object. Overriding toString() is one way user could execute a functor..
        if (typeof functor === 'object')
            {
            r = functor.toString();
            }
        else if (typeof functor === 'function')
            {
            r = functor.call(this);
            }
        else if (typeof functor === 'string')
            r = functor;

        if (typeof r !== 'string') return false;

        return r;
    }
    
    
    /**
     * Creates the DOM and initiates all this-vars.
     * 
     * @return {undefined}
     */
    function _createDOM()
    {
        this.DOM = {};
        this.DOM.$divParent = $("<div class='maTooltip'></div>");
        this.DOM.$divArrow = $("<div class='maTooltip-arrow'></div>");
        this.DOM.$divContents = $("<div class='maTooltip-contents'></div>");
        
        // Optional inline style
        if (this.SETTINGS.inline_style !== null)
            this.DOM.$divContents.attr('style', this.SETTINGS.inline_style);

        this.DOM.$divParent
            .addClass("maTooltip-" + this.SETTINGS.position)
            .append(this.DOM.$divArrow)
            .append(this.DOM.$divContents);
        
        // Init state
        this.DOM.$divParent.css('opacity', 0);
        
        /*
         * There's a second part to the init state, but that will be called once the document
         * has completely finished loading. See constructor.
         */
    }
    
    /**
     * This function is used internally to calculate time to read a message
     * if {tooltiper}.SETTINGS.full_visibility_duration === -2.
     * 
     * @return {number}         Estimated time to read in milliseconds.
     */
    function _calculateTimeToRead()
    {
        var FACTOR = 1;     // Use this factor for any final tweaks to this algorithms end result.
        
        /*
         * Calculate real-duration-algorithm goes something like this..
         */
        
        var fade_in = this.SETTINGS.fade_in_duration; // Optionally: Get the max of fade in and move in. However, I feel a tooltiper with full opacity must be considered visible.
        var text = this.DOM.$divContents.text();
        
        var sum = 500;           // 1. Say it takes half a second for an average user to figure out something happened on the screen.
        sum -= fade_in * 0.25;   // 2. Subtract a quarter of the fade_in time (sum can now be negative)..
        
        
        // 3. Count the number of words we have in the message.
        
        // 3a. Let jQuery trim beginning and end of string.
        var trimmed_text = $.trim(text);
        
        // 3b. Remove all excess space, only allow one space character to occur between words.
        trimmed_text = trimmed_text.replace(/\s+/g, ' ');
        
        // 3b-2.. TODO: Best practices, never trust user input. Thus seperate words that has been concatenated with a dot? Currently "two.words" will be counted as one.
        
        // 3c. Finally break all words into an array and get the length of it.
        var amount_of_words_in_text = trimmed_text.split(' ').length;
        
        // Wikipedia says average reader proof read a text with 180 words per minute: http://en.wikipedia.org/wiki/Words_per_minute
        //     ..180 words per minute translates to 60 000 / 180 = 333.33 ms per word.
        //     ..so convert our count of words to milliseconds and add to sum.
        // 
        // TODO: Implement locale check and have them people abroad recieve an extended amount of time?
        sum += parseInt(amount_of_words_in_text * 333.33);
        
        sum *= FACTOR;
        
        // User supplied an offset?
        if (this.SETTINGS.calculated_time_offset !== null)
            {
            var firstTwo = this.SETTINGS.calculated_time_offset.substr(0, 2);
            var theRest = this.SETTINGS.calculated_time_offset.substr(2);
            
            var number = parseFloat(theRest);

            switch (firstTwo)
                {
                case '-=': sum -= number; break;
                case '+=': sum += number; break;
                case '*=': sum *= number; break;
                case '/=': if (number === 0) sum = 0; else sum /= number; break;
                default: break;
                }
            }
        
        // 4. Always make sure time is not negative.
        if (sum < 0) sum = 0;
        
        // We're done.
        return sum;
    };
    
    
    /**
     * Another helper method, calculate distance between two points
     * Source: http://en.wikipedia.org/wiki/Distance
     */
    function _Distance( point_one, point_two )
    {
        var xDelta = point_two.x - point_one.x;
        var yDelta = point_two.y - point_one.y;
        
        return Math.sqrt( xDelta * xDelta + yDelta * yDelta);
    }
    
    /**
     * Add call backs, will return index. Use that index to remove callbacks. Without the index, all callbacks will be removed.
     * @param defer will cause callback to be called by system thread at the very latest after callbackstack has been deleted (should
     * thus be used if you plan to call .dispose from the stack).
     */
    function _animCompleteCallbackAdd( anim, func, defer )
    {
        var arr = this._animCompleteCallbacks[anim.toLowerCase()];
        
        for (var i in arr)
            if (func === arr[i])
                return i;
        
        var wrapperFunc = func;

        if (defer === true) // Then proxy
            wrapperFunc = ( function () {
                    var _func = function () { func(); };
                    _func._defer = 'maTooltip Secret Proxy String';
                    return _func;
                    } )();

        return arr.push(wrapperFunc) - 1;
    }
    
    /**
     * Use index recieved from _animCompleteCallbackAdd to remove a particular callback or the function reference itself,
     * or leave undefined for all callbacks to be removed.
     */
    function _animCompleteCallbackRemove( anim, func_or_index )
    {
        var arr = this._animCompleteCallbacks[anim.toLowerCase()];
        
        if (typeof func_or_index === 'function')
            for (var i in arr)
                if (e === func_or_index)
                    delete arr[i];
        
        else if (typeof func_or_index === 'number') delete arr[func_or_index];
        else { this._animCompleteCallbacks[anim.toLowerCase()] = []; } // ..else typeof === undefined. Clear all.
    
        return this;
    }
    
    /**
     * Helper
     */
    function _runCallbacksAndClear( anim, no_clear )
    {
        // Exec callbacks and then clear the queue
        var defered = [];
        $.each(this._animCompleteCallbacks[anim.toLowerCase()], function (i, e) {
                if (e._defer === 'maTooltip Secret Proxy String')
                    defered.push(e);
                else
                    e();
                });
        
        if (no_clear !== false)
            this._animCompleteCallbacks[anim.toLowerCase()] = [];
        
        if (defered.length > 0)
            setTimeout(function () {
                for (var i in defered)
                    defered[i]();
            }, 0);

        return this;
    }
    
    
    /**
     * Starts a fade-in animation. OR RESUMES a current one. If tooltip is currently
     * in an ongoing fade-out animation, that will be killed and a new fade-in animation
     * will begin. Function shall not act on a fully visible tooltip.
     */
    function _resumeAnimationFadeIn()
    {
        if (this.isFullyVisible()) return 0;

        _stopAnimation.call(this, 'fade', false);   // Equivalent of a "pause".
        
        var opacity_target = this.SETTINGS.opacity;
        var opacity_current = this.DOM.$divParent.css('opacity');
        var opacity_delta = opacity_target - opacity_current;
        
        var opacity_quotient = opacity_delta / opacity_target;
        
        // Remove extreme values
        if (opacity_quotient > 1) opacity_quotient = 1;
        else if (opacity_quotient < 0) opacity_quotient = 0;
        
        var total_animation_time = this.SETTINGS.fade_in_duration;
        var time_left = opacity_quotient * total_animation_time;
        
        if (time_left > 0)
            {
            var self = this;
            
            this.IsInFadeInAnimation = true;
            
            this.DOM.$divParent.animate({opacity: opacity_target}, {
                queue: 'fade',
                duration: time_left,
                easing: _DEFAULTS.easing_in,
                complete: function () {
                    /*
                     * Chrome bug fix: Opacity won't always display its value, making a read here forces chrome to paint.
                     */
                    self.DOM.$divParent.css('opacity');

                    self.IsInFadeInAnimation = false;
                    
                    // Exec callbacks and then clear the queue
                    _runCallbacksAndClear.call(self, 'fadein');
                }
            }).dequeue('fade'); // jQuery only auto start the standard fx queue. See https://github.com/jquery/api.jquery.com/issues/13

            }

        else // time_left === 0
            {
            this.DOM.$divParent.css('opacity', opacity_target);
            
            // Exec callbacks and then clear the queue
            _runCallbacksAndClear.call(this, 'fadein');
            }
        
        return time_left;
    }
    
    function _resumeAnimationFadeOut()
    {
        _stopAnimation.call(this, 'fade', false);   // Equivalent of a "pause".
        
        var opacity_current = this.DOM.$divParent.css('opacity');
        
        if (opacity_current === 0)
            {
            _killDOM.call(this);
            _runCallbacksAndClear.call(this);
            return 0;
            }
        
        var opacity_start = this.SETTINGS.opacity;
        var total_animation_time = this.SETTINGS.fade_out_duration;
        
        var opacity_quotient = opacity_current / opacity_start;
        
        // Remove extreme values
        if (opacity_quotient > 1) opacity_quotient = 1;
        else if (opacity_quotient < 0) opacity_quotient = 0;
        
        var time_left = opacity_quotient * total_animation_time;
        
        var self = this;
        if (time_left > 0)
            {
            this.IsInFadeOutAnimation = true;
            this.DOM.$divParent.animate({opacity: 0}, {
                queue: 'fade',
                duration: time_left,
                easing: _DEFAULTS.easing_out,
                complete: function () {
                    self.IsInFadeOutAnimation = false;
                    _killDOM.call(self);
                    _runCallbacksAndClear.call(self, 'fadeout');
                }
            }).dequeue('fade');
            }
        else
            {
            // Well this case should in theory already have been dealt with.
            _killDOM.call(this);
            _runCallbacksAndClear.call(this, 'fadeout');
            }
        
        return time_left;
    }
    
    /*
     * Helper
     */
    function _getRemainingMoveTime(total_anim_time, current_position, start_position, final_position)
    {
        // Calc distances
        var total_distance = _Distance(start_position, final_position);
        var alreadyMoved_distance = _Distance(start_position, current_position);
        
        // Calc quotient
        var quotient = alreadyMoved_distance / total_distance;
        
        // Remove extremes
        if (quotient > 1)
            quotient = 1;
        else if (quotient < 0)
            quotient = 0;
        
        // Calc remaining time for animation
        return total_anim_time * (1 - quotient);
    }
    
    
    /**
     * Starts a move-in animation. OR RESUMES a current one. All positioning values will always be recalculated.
     * 
     * If tooltip is currently in an ongoing move-out animation, that will be killed and a new move-in animation
     * will begin.
     * 
     * Optionally, you can supply @param only_set_final_position to true. If so, then whis method will, as is
     * actually the case when move_in_duration is set to zero; recalculate position and update the tooltiper position.
     * Thus, this method should be called with this variable set to true whenever we have reason to suspect that the
     * position of a visible tooltip already in place needs an update.
     * 
     * Always return time_left. Doesn't act on a fully visible tooltip.
     */
    function _resumeAnimationMoveIn(only_set_final_position)
    {
        only_set_final_position = only_set_final_position || false;
        
        // Early exit (ignore calls on a tooltiper already positioned and fully visible)
        if (this.isFullyVisible() && !only_set_final_position) return 0;
        
        // Alias
        var $ttpDiv = this.DOM.$divParent; // ttpDiv alias for "ToolTiPer Div".
        
        // Alias
        var mid = this.SETTINGS.move_in_duration;
        
        var dp = undefined;
        
        // Pause a running move animation..
        if (this.IsInMoveInAnimation || this.IsInMoveOutAnimation)
            {
            _stopAnimation.call(this, 'move', false);
            }

        else // Or reset position if we intend to do some animation.
            {
            dp = this.getDimensionsAndPositions();
            if (mid > 0)
                {
                $ttpDiv.css('top', dp.top_start);
                $ttpDiv.css('left', dp.left_start);
                
                // Also update current dp who could have failed to get a "current" position
                dp.top_current = dp.top_start;
                dp.left_current = dp.left_start;
                }
            }
        
        if (dp === undefined)
            dp = this.getDimensionsAndPositions();
        
        var time_left = 0;
        
        // Early exit: There might be no move_in_duration or we only need an update of final position.
        if (mid === 0 || only_set_final_position === true)
            {
            // getDimensionsAndPositions() has already accounted for a move_in_duration === 0 and thus set start
            // positions to final as a way to make an early exit. But we'll be even more explicit here.
            $ttpDiv.css('top', dp.top_final); 
            $ttpDiv.css('left', dp.left_final);
            
            _runCallbacksAndClear.call(this, 'movein');
            
            // ..code here will return time_left = 0!
            }
        else // We want an animation
            {
            // Get current position
            var current_position = {x: dp.left_current, y: dp.top_current};
            
            // Also get final and starting position
            var final_position = {x: dp.left_final, y: dp.top_final};
            var start_position = {x: dp.left_start, y: dp.top_start};
            
            var real_duration = _getRemainingMoveTime.call(this, mid, current_position, start_position, final_position);
            
            if (real_duration > 0)
                {
                this.IsInMoveInAnimation = true;

                time_left = real_duration; // Will be returned
                var self = this;
                this.DOM.$divParent.animate({top: dp.top_final, left: dp.left_final}, {
                    queue: 'move',
                    duration: real_duration,
                    easing: _DEFAULTS.easing_in,
                    complete: function () {
                        
                        self.IsInMoveInAnimation = false;
                        _runCallbacksAndClear.call(self, 'movein');
                    }
                }).dequeue('move');
                }
            else
                {
                // Make absolute sure we're at the final position
                $ttpDiv.css('top', dp.top_final);
                $ttpDiv.css('left', dp.left_final);
                _runCallbacksAndClear.call(this, 'movein');
                // ..code will return time_left = 0.
                }
            }

        return time_left;
    }
    
    
    function _resumeAnimationMoveOut()
    {
        // Early exit (ignore calls on a tooltiper who's fully hidden)
        if (this.isFullyHidden())
            {
            return 0;
            }
        
        if (this.IsInMoveInAnimation || this.IsInMoveOutAnimation)
            _stopAnimation.call(this, 'move', false);
        
        var dp = this.getDimensionsAndPositions();
        
        var $ttpDiv = this.DOM.$divParent;
        
        if (dp.left_current === null || dp.top_current === null)
            {
            // Revert (or call it "assume") to final (which is start)
            $ttpDiv.css('top', dp.top_final);
            $ttpDiv.css('left', dp.left_final);
            
            dp.left_current = dp.left_final;
            dp.top_current = dp.top_final;
            }
        
        
        var mod = this.SETTINGS.move_out_duration;
        var time_left = 0;
        
        if (mod > 0)
            {
            // Get current position
            var current_position = {x: dp.left_current, y: dp.top_current};
            
            // Also get starting and final position (note the reversed relationship)
            var start_position = {x: dp.left_final, y: dp.top_final};
            var final_position = {x: dp.left_start, y: dp.top_start};
            
            var real_duration = _getRemainingMoveTime.call(this, mod, current_position, start_position, final_position);
            
            if (real_duration > 0)
                {
                this.IsInMoveOutAnimation = true;
                var self = this;
                $ttpDiv.animate({top: dp.top_start, left: dp.left_start}, {
                        queue: 'move',
                        duration: real_duration,
                        easing: _DEFAULTS.easing_out,
                        complete: function () {
                            self.IsInMoveOutAnimation = false;
                            _runCallbacksAndClear.call(self, 'moveout');
                        }}).dequeue('move');
                
                time_left = real_duration;
                // ..code will return updated time_left variable.
                }
            else
                {
                $ttpDiv.css('top', dp.top_start);
                $ttpDiv.css('left', dp.left_start);
                _runCallbacksAndClear.call(this, 'moveout');
                
                // ..code will return time_left = 0
                }
            }
        else
            {
            _runCallbacksAndClear.call(this, 'moveout');
            // ..code will return time_left = 0
            }
        
        return time_left;
    }
    

    function _stopAnimation( which_queue, jump_to_end )
    {
        // Argslist: .stop( [queue] [, clearQueue] [, jumpToEnd] )
        this.DOM.$divParent.stop(which_queue, true, jump_to_end);
        
        switch (which_queue)
        {
            case 'fade':
                this.IsInFadeInAnimation = false;
                this.IsInFadeOutAnimation = false;
                break;
                
            case 'move':
                this.IsInMoveInAnimation = false;
                this.IsInMoveOutAnimation = false;
                break;
            
            default: throw new Error(_ERROR_MESSAGE_PREFIX + 'Internal error. Asked to PAUSE an animation queue that doesn\'t exist.');
        }

        
    }
    
    function _killDOM()
    {
        // Stop all animations
        if (this.isAnyAnimationAlive())
            {
            _stopAnimation.call(this, 'fade', true); // Let him jump to end if we have callbacks to trigger.
            _stopAnimation.call(this, 'move', true);
            }
        
        // Reset state
        this.DOM.$divParent.css('opacity', 0);
        
        if (this.SETTINGS.one_time_only)
            {
            this.DOM.$divParent.remove();
            }
        
        else
            {
            // Detach
            this.DOM.$divParent.detach();
            }
    }
    
    


    /**
     * --> END PRIVATE FUNCTIONS
     * 
     * PUBLIC functions (or call it API):
     * ----------------------------------
     */

    m.prototype.dispose = function ()
    {
        this.SETTINGS.one_time_only = true; // Fake it for the _killDOM call in the next line who will completely remove elements =)
        _killDOM.call(this);
        
        delete this.DOM;
        delete maTooltip.INSTANCES[this.name]; // EVEN though "true" one timers never save their handle. See .dispose.
        
        delete this.IsInFadeInAnimation;
        delete this.IsInFadeOutAnimation;
        delete this.IsInMoveInAnimation;
        delete this.IsInMoveOutAnimation;
        delete this.LastMessageDuration;
        delete this.LastMessageText;
        delete this.SETTINGS;
        delete this.name;
        delete this._animCompleteCallbacks;
        
        clearTimeout(this.__timeoutID_hide);
        delete this.__timeoutID_hide;
        
        // Deregister resize handler
        $(window).off('.maTooltip', this._windowResizeHandler);
        
        // Deregister all else (actually, only if full_visibility_duration was set to -3 we'd have hover handlers registered on target_element)
        this.$.off('.maTootip');
        delete this.$;
        
        delete this._windowResizeHandler;
        
        // Okay we forgot sometin' ?
    };

    /**
     * Makes a tooltip visible. Initial state for a tooltip after creation is NOT visible. You can always check the visibily
     * through a call to {tooltiper}.isFullyVisible(). There's also a method called {tooltiper}.isFullyHidden().
     * 
     * @param {mixed} message   @see _executeFunctor. Message is optional because one can set a static_message. @see constructor.
     * 
     * @return {maTooltip}     Returns itself for chaining purposes.
     */
    m.prototype.show = function ( message )
    {
        // Used to offset forward timed calls. Needed [wha whaaat, yes we are fundamentalist's] because of processing overhead.
        // On my system, a two millisecond latency made opacity reach target if fade in animations were used before .hide() was
        // called on a tooltiper with his tooltiper duration set to 0 milliseconds. Thus I increased this var to 2 ms.
        var LATENCY_PENALTY = 2;
        
        message = message || this.SETTINGS.static_message; // <-- Can be set to null.
        
        // Get message, fall back to a parse of contents
        message = _executeFunctor(message);
        if (message === false)
            message = this.DOM.$divContents.html(); // <-- Can be empty string.
        
        // Any difference since the last time?
        var msg_changed = message !== this.LastMessageText ? true : false;
        
        // Only set html if the message is anything else than supplied default message. At this point,
        // if the message are the same as was supplied with the _DEFAULTS object, we will assume
        // user is in complete control of the contents outside the domain of maTooltip.
        if (msg_changed)
            this.DOM.$divContents.html(message);
        
        // Save last message after initial processing.
        this.LastMessageText = message;
        
        // Early exit: If message hasn't changed, and there's an "in"-animation going on: Do nuttin.
        if (!msg_changed && (this.IsInFadeInAnimation || this.IsInMoveInAnimation))
            return this;
        
        // Calc duration
        var real_duration = undefined;

        if (this.SETTINGS.full_visibility_duration === -2)
            if (msg_changed)
                {
                real_duration = _calculateTimeToRead.call(this);
                this.LastMessageDuration = real_duration;
                }
            else
                real_duration = this.LastMessageDuration;
        else // duration is >= -1 (forever) || -3 (hover: also forever)
            real_duration = this.SETTINGS.full_visibility_duration === -3 ? -1 : this.SETTINGS.full_visibility_duration;
            
        /*
         * Helper method
         */
        function __initTimerAndExit(duration) 
            {
            clearInterval(this.__timeoutID_hide);
            var self = this;
            this.__timeoutID_hide = setTimeout(function () {
                self.hide();
                }, duration);
            return this;
            }
        
        /*
         * IF tooltiper is fully visible we just need to prolong the display time (multiple
         * consecutive calls to .show()). If message has changed, we shall cause a flash
         * depending on _DEFAULTS.
         */
        var isFullyVisible = this.isFullyVisible();
        if (isFullyVisible && real_duration > -1)
            {
            if (msg_changed && _DEFAULTS.flash_on_text_change) // Cause a flash
                return this.hide(true).show(message); // <-- Recursive call!
                
            else    // Don't cause a flash, just prolong.
                __initTimerAndExit.call(this, real_duration + LATENCY_PENALTY);
            }
        else if (isFullyVisible /* && real_duration === -1 */  ) // Live forever = early exit.
            {
            clearInterval(this.__timeoutID_hide); // <-- Best practices if duration value has changed since last call.
            return this;
            }
        
        /*
         * Else he could be caught in a running animation.
         * Animation function will deal with that, all we need to do now is act on msg_changed.
         */
        if (msg_changed && this.isAnyAnimationAlive() && _DEFAULTS.flash_on_text_change)
            {
            this.hide(true);
            }
        
        // Append
        if (this.isFullyHidden())
            {
            this.DOM.$divParent.insertBefore( $(this.SETTINGS.insert_before) );
            }
        
        // Begin or resume animations
        var time_left_movein = _resumeAnimationMoveIn.call(this);
        var time_left_fadein = _resumeAnimationFadeIn.call(this);
        
        // Get the max
        var time_left = Math.max(time_left_fadein, time_left_movein);

        if (real_duration > -1)
            __initTimerAndExit.call(this, time_left + real_duration + LATENCY_PENALTY);
        
        return this;
    };
    
    
  /**
	 * Hides the tooltiper. If the tooltiper is one time only tooltiper, then he will be completely deleted from the DOM,
	 * otherwise only detached. @see jQuery documentation on .remove and .detach.
	 * 
	 * @param {number} hide_instantly    Optionally, you can specify this param to make the tooltip hide at once
	 *                                   and not pay any attention to fade out- or move out animations.
	 * 
     * @return {maTooltip}               Himself. For chaining purposes.
	 */
	m.prototype.hide = function ( hide_instantly )
	{
	    clearTimeout(this.__timeoutID_hide);
	    
	    // Early exit, ignore consecutive calls.
	    if ((this.IsInFadeOutAnimation || this.IsInMoveOutAnimation) && hide_instantly === undefined)
            return this;
	    
	    if (hide_instantly === true)
	        {
	        _killDOM.call(this);
	        return this;
	        }
	    
	    if (this.SETTINGS.one_time_only)
	        {
	        var self = this;
	        _animCompleteCallbackAdd.call(this, 'fadeout', function () { self.dispose(); }, true);
	        }
	    
	    // ..could still be visible or in a fade-in/fade-out animation but anim-function will deal with that.
	    _resumeAnimationFadeOut.call(this);
	    _resumeAnimationMoveOut.call(this);

	    return this;
	};
	
	m.prototype.toggle = function ()
	{
	    if ( this.isFullyVisible() || this.IsInFadeInAnimation || this.IsInMoveInAnimation)
            this.hide();
        else
            this.show();
    };
    
    m.prototype.isAnyAnimationAlive = function () {
        return this.IsInFadeInAnimation || this.IsInFadeOutAnimation || this.IsInMoveInAnimation || this.IsInMoveOutAnimation || false;
    };
    
    
    /**
     * This get the dimensions and positions $divParent has on the screen. Remember that $divParent is positioned
     * (style='position: absolute'). Also this method must never be called before $divParent has a size.
     * 
     * @param {object} dimensions    You can pass in an object here if you want to update only unknown fields
     *                               accordingly. Otherwise, use the returned object which will contain all
     *                               fields "calculated" from scratch.
     * 
     * @return {object}              The dimensions and positions of the tooltiper.
     * 
     * @throws {Error}               Unlikely that an error ever will occur.
     */
     m.prototype.getDimensionsAndPositions = function ( dimensions /* optional */)
     {
         dimensions = typeof dimensions === 'object' ? dimensions : {};
         var d = {};

         d.targetElemOffset = 'targetElemOffset' in dimensions ? dimensions.targetElemOffset : this.$.offset();
         d.targetElemWidth = 'targetElemWidth' in dimensions ? dimensions.targetElemWidth : this.$.outerWidth();
         d.targetElemHeight = 'targetElemHeight' in dimensions ? dimensions.targetElemHeight : this.$.outerHeight();

         d.tooltiperWidth = 'tooltiperWidth' in dimensions ? dimensions.tooltiperWidth : this.DOM.$divParent.outerWidth();
         d.tooltiperHeight = 'tooltiperHeight' in dimensions ? dimensions.tooltiperHeight : this.DOM.$divParent.outerHeight();
         
         /*
          * But we didn't query the top and left attributes of course, these are supposed to be calculated now.
          */
         
         var top_final = null;
         var left_final = null;
         
         var top_current = parseInt(this.DOM.$divParent.css('top'));
         var left_current = parseInt(this.DOM.$divParent.css('left'));
         
         // Current positions might not have been set yet.
         if (isNaN(top_current)) top_current = null;
         if (isNaN(left_current)) left_current = null;
         
         var top_start = null;
         var left_start = null;
         
         /*
          * Helper method, might be called more than once.
          */
         function _getPosition( placement, dimensions )
         {
             var d = dimensions;
             
             var top = undefined;
             var left = undefined;
             
             switch ( placement ) // Assume string.
                 {
                 case 'LEFT':
                     top = d.targetElemOffset.top - d.tooltiperHeight * 0.5 + d.targetElemHeight * 0.5;
                     left = d.targetElemOffset.left - d.tooltiperWidth;
                     break;

                 case 'TOP':
                     top = d.targetElemOffset.top - d.tooltiperHeight;
                     left = d.targetElemOffset.left + 0.5 * d.targetElemWidth - 0.5 * d.tooltiperWidth;
                     break;

                 case 'RIGHT':
                     top = d.targetElemOffset.top - d.tooltiperHeight * 0.5 + d.targetElemHeight * 0.5;
                     left = d.targetElemOffset.left + d.targetElemWidth;
                     break;

                 case 'BOTTOM':
                     top = d.targetElemOffset.top + d.targetElemHeight;
                     left = d.targetElemOffset.left + 0.5 * d.targetElemWidth - 0.5 * d.tooltiperWidth;
                     break;

                 default:
                     throw new Error(_ERROR_MESSAGE_PREFIX + 'Tooltiper "' + this.name + '" wanted to run an unknown positioning algorithm!');
                     break;
                 }
                 
             return {top: top, left: left};
         }
         
         // Get final position
         var position = undefined;
         if (this.SETTINGS.move_in_to !== null)
             position = {
                 top: this.SETTINGS.move_in_to.top,
                 left: this.SETTINGS.move_in_to.left
                 };
         else
             position = _getPosition.call(this, this.SETTINGS.position, d);
         
         top_final = position.top;
         left_final = position.left;
         
         // Alias
         var from = this.SETTINGS.move_in_from;
         
         // If move_in_duration === 0, use final as start.
         if (this.SETTINGS.move_in_duration === 0)
             {
             top_start = position.top;
             left_start = position.left;
             }
         
         // 1. Start position is a mapobject with already known values.. copy thoose.
         else if (typeof from === 'object')
             {
             top_start = from.top;
             left_start = from.left;
             }
         
         // 2. Start position is a float between -1 and 1, 
         else if (from > -1 && from < 1) // Assume number.
             {
             /*
              * Algorithm works like this:
              *     1. Get the opposite position's coordinates.
              *     2. Early exit: If our float === 0, return the complete opposite.
              *     3. Invert our float: float = 1 - float.
              *     3. Get delta (final - start) and multiply it with our inverted float.
              *     4. Apply delta to start and return.
              */
             var opposite_pos = undefined;
             switch (this.SETTINGS.position)
                 {
                 case 'LEFT': opposite_pos = 'RIGHT'; break;
                 case 'TOP': opposite_pos = 'BOTTOM'; break;
                 case 'RIGHT': opposite_pos = 'LEFT'; break;
                 case 'BOTTOM': opposite_pos = 'TOP'; break;
                 default: break; // Dead code.
                 }
             
             var opposite_coordinates = _getPosition.call(this, opposite_pos, d);
             
             if (from === 0)
                 {
                 top_start = opposite_coordinates.top;
                 left_start = opposite_coordinates.left;
                 }
             else
                 {
                 // Get nominal distance between edges
                 var deltaX = Math.abs(left_final - opposite_coordinates.left);
                 var deltaY = Math.abs(top_final - opposite_coordinates.top);
                 
                 switch (this.SETTINGS.position)
                     {
                     case 'LEFT':
                         // Apply only X delta.
                         top_start = top_final;
                         if (from > 0)
                             left_start = left_final + ((1 - from) * deltaX);
                         else
                             left_start = left_final - ((1 - (-1 * from)) * deltaX);
                         break;
                     case 'TOP':
                         // Apply only Y delta.
                         left_start = left_final;
                         if (from > 0)
                             top_start = top_final + ((1 - from) * deltaY);
                         else
                             top_start = top_final - ((1 - (-1 * from)) * deltaY);
                         break;
                     case 'RIGHT':
                         // Apply only X delta.
                         top_start = top_final;
                         if (from > 0)
                             left_start = left_final - ((1 - from) * deltaX);
                         else
                             left_start = left_final + ((1 - (-1 * from)) * deltaX);
                         break;
                     case 'BOTTOM':
                         // Apply only Y delta.
                         left_start = left_final;
                         if (from > 0)
                             top_start = top_final - ((1 - from) * deltaY);
                         else
                             top_start = top_final + ((1 - (-1 * from)) * deltaY);
                         break;
                     }
                 }
             }
         
         // 3. Start position is in relative pixels
         else if (from <= -1 || from >= 1)
             {
             switch (this.SETTINGS.position)
                 {
                 case 'LEFT': // Then center is towards the right.
                     left_start = left_final + from; // Negative value will move it in the right direction.
                     top_start = top_final;
                     break;
                 case 'TOP': // Middle is towards the bottom.
                     top_start = top_final + from;
                     left_start = left_final;
                     break;
                 case 'RIGHT': // Center towards left!
                     left_start = (-1 * from) + left_final;
                     top_start = top_final;
                     break;
                 case 'BOTTOM': // Center towards top!
                     top_start = (-1 * from) + top_final;
                     left_start = left_final;
                     break;
                 default: break; // Dead code.
                 }
             }
         else
             throw new Error(_ERROR_MESSAGE_PREFIX + 'Apparently the settings parser has done a bad job."' + this.name + '" failed to calculate starting position.');
   
         return {
             targetElemOffset: d.targetElemOffset,
             targetElemWidth: d.targetElemWidth,
             targetElemHeight: d.targetElemHeight,
             tooltiperWidth: d.tooltiperWidth,
             tooltiperHeight: d.tooltiperHeight,
             top_final: top_final,
             top_current: top_current,
             top_start: top_start,
             left_final: left_final,
             left_current: left_current,
             left_start: left_start
             };
     };
     
     m.prototype.isFullyVisible = function ()
     {
         // Early exit; any animation alive must mean tooltiper ISN'T fully visible.
         if (this.isAnyAnimationAlive() === true)
             return false;
         
         // Secondly, we need to manually compare current and target opacity (current and target position?*).
         return this.DOM.$divParent.css('opacity') >= (this.SETTINGS.opacity * 0.90); // *0.9 = Allow some variation.
         
         // * current and target position is a heavy computation, and will not produce accurate results. Solution
         //   is to ALWAYS call move animations before fade animations.
     };
     
     m.prototype.isFullyHidden = function ()
     {
         if (this.isAnyAnimationAlive() === true)
             return false;
         
         return this.DOM.$divParent.css('opacity') == 0; // em, absolutely not strict comparison =)
     };
     
     /*
      * Use this if you know that the position of the tooltiper have most likely changed and need an update.
      * maTooltip will do this on window resize and also once the DOM:s apperance has fully finished loading.
      * But other external things cannot be accounted for, for example if a targetelement actually moves on
      * the screen.
      */
     m.prototype.positionMightBeDirty = function ()
     {
         if (this.isFullyVisible())
             _resumeAnimationMoveIn.call(this, true); // param says here: "only set final position" (it is "fully visible"!).

         else if (this.IsInMoveInAnimation)
             _resumeAnimationMoveIn.call(this);
         
         else if (this.IsInMoveOutAnimation)
             _resumeAnimationMoveOut.call(this);
         
         else if (this.IsInFadeInAnimation || this.IsInFadeOutAnimation)
             _resumeAnimationMoveIn.call(this, true); /* Only POSITION might be dirty! */
         
         return this;
     };

    return m; // <-- API.
}());


/*
 *  TESTING ARENA
 *  -------------
 */
/*$(document).ready( function ()
{
	setTimeout(function () {
		
		new maTooltip($("input[name='inputDayTitle']"), {
			static_message: "Hello world very long text indeed d!",
			insert_before: $("input[name='inputDayTitle']").parent(),
			one_time_only: true,
			duration: 3000,
			fade_in_duration: 1000,
			fade_out_duration: 1000
		});
		
	}, 2000);
});*/
