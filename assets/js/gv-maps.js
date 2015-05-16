/**
 * Part of GravityView_Ratings_Reviews plugin. This script is enqueued from
 * front-end view that has ratings-reviews setting enabled.
 *
 * globals jQuery, GV_MAPS, google
 */

// make sure GV_MAPS exists
window.GV_MAPS = window.GV_MAPS || {};

(function($){

    "use strict";

    /**
     * Passed by wp_localize_script() with some settings
     * @type {object}
     */
    var self = $.extend( {
        'didScroll': false,
        'mapOffset': 0,
        'mapStickyContainer': null,
        'mapEntriesContainerClass': '.gv-map-entries',
        'markers': [],
        'singleView': false

    }, GV_MAPS );

    /**
     * Google Map object, set up in `self.setup_map`
     */
    var maps = [];
    self.maps = [];

    var bounds = new google.maps.LatLngBounds();
    //var infowindow = new google.maps.InfoWindow({maxWidth:0});


    /**
     * Set up the map functionality
     * @return {[type]} [description]
     */
    self.init = function() {
        // Do we really need to process maps?
        if( document.getElementById( self.map_id_prefix + '-0' ) === null ) {
            return;
        }

        //check if it is a single entry view
        if( $('.gv-map-single-container').length > 0 ) {
            self.singleView = true;
        }

        // convert multiple maps to a number
        self.multiple_maps = parseInt( self.multiple_maps, 10 );

        // make sure map canvas is less than 50% of the window height (default 400px)
        self.prepareStickyCanvas();

        self.setupMaps();
        self.processMarkers();

        // mobile behaviour
        self.initMobile();

        self.startScrollCheck();

        // bind markers animations
        self.initAnimateMarkers();
    };

    /**
     * Initiate the map object, stored in map
     * @return {void}
     */
    self.setupMaps = function() {
        var m;

        self.MapOptions.zoom = parseInt( self.MapOptions.zoom, 10 );
        self.MapOptions.mapTypeId = self.getMapType();

        for( var i = 0; i <= self.multiple_maps; i++ ) {
            m = new google.maps.Map( document.getElementById( self.map_id_prefix + '-' + i.toString() ), self.MapOptions );
            self.maps.push( m );
        }

    };

    /**
     * Add markers to the maps
     * @return {void}
     */
    self.processMarkers = function() {
        for ( var i in self.markers_info ) {
            self.maps.forEach( self.add_marker, self.markers_info[ i ] );
        }
    };

    /**
     * Add marker to a map
     *
     * @param map google.maps.Map object
     * @param i array index
     * @param array
     *
     * 'this' gets the forEach thisArg (extra argument)
     *
     */
    self.add_marker = function( map, i, array ) {

        var geo = new google.maps.LatLng( this.lat, this.long );

        var marker = new google.maps.Marker({
            map: map,
            icon: self.icon,
            url: this.url,
            position: geo,
            entryId: this.entry_id
        });

        bounds.extend( marker.position );

        self.maps[ i ].fitBounds( bounds );

        self.addMarkerEvents( marker );

        self.markers.push( marker );
    };

    /**
     * Add event listeners to Markers
     *
     * @todo Add a close X to the infobox
     * @param {[type]} marker [description]
     */
    self.addMarkerEvents = function( marker ) {

        if(  self.singleView ) {
            return;
        }

        // The marker has been clicked.
        google.maps.event.addListener( marker, 'click', self.markerOnClick( marker ) );

        // on Mouse over
        google.maps.event.addListener( marker, 'mouseover', self.markerOnOver( marker ) );

        // on mouseout
        google.maps.event.addListener( marker, 'mouseout', self.markerOnMouseOut( marker ) );

    };

    // marker events callbacks

    /**
     * Open the entry link when marker has been clicked
     *
     * @param marker google.maps.Marker Google maps marker object
     * @returns {Function}
     */
    self.markerOnClick = function( marker ) {
        return function() {
            window.open( marker.url, '_top' );
        };
    };

    /**
     * Highlights the assigned entry on mouse over a Marker
     *
     * @param marker google.maps.Marker Google maps marker object
     * @returns {Function}
     */
    self.markerOnOver = function( marker ) {
        return function() {
            $( '#gv_map_' + marker.entryId ).addClass('gv-highlight-entry');
        };
    };

    /**
     * Remove the highlight of the assigned entry on mouse out a Marker
     *
     * @param marker google.maps.Marker Google maps marker object
     * @returns {Function}
     */
    self.markerOnMouseOut = function( marker ) {
        return function() {
            $( '#gv_map_' + marker.entryId ).removeClass('gv-highlight-entry');
        };
    };

    /*    self.markerOnClick2 = function( e ) {

     // If the expanded content is open and the marker is being clicked, just close it.
     if( infowindow.zIndex === 4849 ) {

     // Restore previous zIndex
     infowindow.setZIndex(1000);

     // Close the infobox
     infowindow.close(map, this);
     return;
     }

     // Close any infoboxes that are still open
     infowindow.close(map, this);

     // This is a hint that it's the full infobox, not small.
     infowindow.setZIndex(4849);

     // Allow to be as big as it wants to be (default size override)
     infowindow.setOptions({maxWidth:0});

     infowindow.setContent( '<div class="gv-map-infowindow infowindow-full"><h3>This will be the full infobox content window</h3>More information than just on hover. Likely a link to the entry.</div>' );

     infowindow.open( map, this );
     };

     self.markerOnOver2 = function() {

     // If we're in the full screen, don't process
     if(infowindow.getZIndex() === 4849) {
     return;
     }

     infowindow.close(map, marker); // Close any infoboxes that are still open

     // You can pass different settings if necessary
     //infowindow.setOptions(settings);

     infowindow.setContent( '<div class="gv-map-infowindow infowindow-small"><p>Icon representing entry and summary will go here. Click for more information.</p></div>' );

     infowindow.open(map, marker);

     };

     self.markerOnMouseOut2 = function() {

     // If we're in the full screen, don't close on mouseout
     if(infowindow.getZIndex() === 4849) {

     } else {
     infowindow.close(map, this);
     }
     };*/


    // Animate markers when mouse is over an entry

    /**
     *  Bind events when mouse is over an entry
     */
    self.initAnimateMarkers = function () {
        if(  self.singleView ) {
            return;
        }
        $('.gv-map-view').on( 'mouseenter', self.animateMarker );
    };

    /**
     * Starts and Stops the marker animation
     * @param e object Event
     */
    self.animateMarker = function ( e ) {

        var id = this.id.replace( 'gv_map_','' );

        self.markers.forEach( self.triggerAnimationMarker, id );
    };

    /**
     * Starts Bounce marker animation for the marker associated with the Entry
     *
     * @param marker google.maps.Marker Google maps marker object
     * @param i
     * @param array
     */
    self.triggerAnimationMarker = function( marker, i, array ) {
        if( marker.entryId === this ) {

            // Don't interrupt something beautiful
            if( marker.animating ) { return; }

            marker.setAnimation( google.maps.Animation.BOUNCE );

            // stop the animation after one bounce
            setTimeout( self.stopAnimationMarker, 750, marker );
        }
    };

    /**
     * Stops all the marker animations
     *
     * @param marker google.maps.Marker Google maps marker object
     * @param i
     */
    self.stopAnimationMarker = function( marker, i ) {
        marker.setAnimation( null );
    };


    // sticky maps functions
    /**
     * Set properties for sticky map and make sure Map Canvas height is less than 50% of window height viewport
     * Default Canvas height = 400 px (@see assets/css/gv-maps.css )
     */
    self.prepareStickyCanvas = function() {
        // set map container (just for sticky purposes)
        self.mapStickyContainer = $( '.gv-map-sticky-container' );

        var windowHeight = $( window ).height(),
            doubleCanvasHeight = self.mapStickyContainer.height() * 2;

        // if viewport height is less than 2x 400 px
        if( windowHeight < doubleCanvasHeight ) {
            $( '.gv-map-canvas').height( windowHeight / 2 );
        }

    };

    self.initOffset = function() {
        self.mapOffset = self.mapStickyContainer.offset().top;
    };

    self.setScroll = function() {
        self.didScroll = true;
    };

    self.startScrollCheck = function() {
        if( self.mapStickyContainer.length > 0 ) {
            $(window).one( 'scroll', self.initOffset );
            setInterval( self.runOnScroll, 250 );
        }
    };

    self.runOnScroll = function() {
        if( self.didScroll ) {
            self.didScroll = false;
            var scroll = $(window).scrollTop();
            var canvasObj = self.mapStickyContainer.find( '.' + self.map_id_prefix );
            var listObj = $( self.mapEntriesContainerClass );
            var canvasWidth = canvasObj.width(),
                canvasHeight = canvasObj.height();
            if( scroll >= self.mapOffset ) {
                canvasObj.width( canvasWidth );
                self.mapStickyContainer.addClass('gv-sticky');
                if( self.template_layout === 'top' ) {
                    listObj.css( 'margin-top', canvasHeight+'px' );
                }

            } else {
                canvasObj.width( '100%' );
                self.mapStickyContainer.removeClass('gv-sticky');
                if( self.template_layout === 'top' ) {
                    listObj.css( 'margin-top', '' );
                }
            }

        }
    };

    // Mobile

    /**
     * Check if the page is being loaded in a tablet/mobile environment,
     *  and if yes, run special functions
     * $mobile-portrait: 320px;
     * $mobile-landscape: 480px;
     * $small-tablet: 600px;
     */
    self.initMobile = function() {
        // only apply this logic for the map template containing the sticky map (even if it is not pinned)
        if( self.mapStickyContainer.length <= 0 ) {
            return;
        }

        var viewPort = $( window ).width();

        if( viewPort <= 600 ) {
            self.mobileMapToTop();
        }

    };

    /**
     * Move the sticky map to the top, when aligned to the right.
     */
    self.mobileMapToTop = function() {
        var parent =  self.mapStickyContainer.parent(),
            grandPa = $('.gv-map-container');

        if( parent.hasClass('gv-grid-col-1-3') && 1 === parent.index() ) {
            parent.detach().prependTo( grandPa );
        }

    };

    // helpers

    /**
     * Convert map type setting into google.maps object
     * @returns {*}
     */
    self.getMapType = function() {
        switch ( self.MapOptions.mapTypeId.toUpperCase() ) {
            case 'SATELLITE':
                return google.maps.MapTypeId.SATELLITE;
            case 'HYBRID':
                return google.maps.MapTypeId.HYBRID;
            case 'TERRAIN':
                return google.maps.MapTypeId.TERRAIN;
            default:
            case 'ROADMAP':
                return google.maps.MapTypeId.ROADMAP;
        }
    };

    // Init!
    $( self.init );

    // window scroll
    $(window).scroll( self.setScroll );

}(jQuery));
