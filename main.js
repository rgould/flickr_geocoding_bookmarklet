(function(window, undefined){
  
  var $,
    BASE_URL = "http://localhost:8000/",
    JQUERY_SRC = "http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js",
    GMAPS_API = "http://maps.google.com/maps/api/js?sensor=false&callback=?",
    STYLE_URL = BASE_URL + "main.css",
    MARKER_SRC = BASE_URL + "/arrow.png",
    PANEL_SRC = "/photo_geopanel_fragment.gne",
    magic_cookie,
    map,
    lat, 
    lng, 
    zoom,
    map_type,
    has_location,
    address,
    marker,
    geocoder,
    $input,
    $spinner,
    $container,
    $background;
    
  function log(){
    if (window.console && typeof window.console.log == "function"){
      console.log.apply(console, arguments);
    }
  }
  
  function initialize(){
    load_jquery();
  }
  
  function reload(){
    show();
    $input.select();
  }
  
  function load_jquery(){
    var script = document.createElement("script");
    script.src = JQUERY_SRC;
    script.onload = script.onreadystatechange = jquery_loaded;
    document.body.appendChild(script);
  }

  function load_styles(){
    var style = $("<link />", {
      rel: "stylesheet",
      type: "text/css",
      href: STYLE_URL
    });
    $("head").append(style);
  }
  
  function jquery_loaded(){
    
    $ = jQuery;
    $.noConflict();
    load_styles();
    magic_cookie = $("input[name=magic_cookie]").val();
    $.getJSON(GMAPS_API, function(){
      $.get(PANEL_SRC, function(html){
        draw_panel(html);
        init_map();
        init_marker();
        init_form();
        $spinner.hide();
      });
    });
  }
    
  function draw_panel(html){
    
    log("magic cookie", magic_cookie, 1234);
    
    $spinner = $("<div class='spinner'/>");
    
    $background = $("<div>", {
      id: 'flickr_bookmarklet_background',
      title: "Close"
    });
    
    $background.click(hide);
    
    $container = $("<div>", {id: 'flickr_bookmarklet'});
    $container.html(html);
    $container.find(".close").click(hide);
    $container.find(".breadcrumb h3").html("Choose your location");
    $container.append($spinner);

    $("body").append($container).append($background);
  }
  
  function init_form(){
    var $save, $cancel, $form, $button;

    $form = $container.find("form[name=location_search]");
    $input = $form.find("input");
    $button = $form.find("button");
    
    $form.prepend($("<label>", {
      "for": $input.attr("id")      
    }).html("Search:"));
    
    $form.submit(function(){
      address = $input.val();
      find(address);
      set_cookie("address", address);
      return false;
    });
    
    $input.val(address).select();
    
    $save = $("<button class='Butt'>SAVE LOCATION</button>");
    $cancel = $("<button class='CancelButt'>CANCEL</button>");
    
    $container.append($save).append($cancel);
    $cancel.click(hide);
  }
  
  function get_initial_position(){
    var src, match, last_location, parts;
    
    src = $("#photo-story-map img:last").attr("src") || "";
    match = src.match(/clat=([\d.-]*)&clon=([\d.-]*)&zoom=([\d.-]*)/);
    
    if (match){
      lat = parseFloat(match[1], 10);
      lng = parseFloat(match[2], 10);
      zoom = parseFloat(match[3], 10);
      has_location = true;
    }
    
    last_location = get_cookie("location");
    
    if (last_location) {
      parts = last_location.split(",");
    } 
    
    lat = lat || parseFloat(parts[0], 10) || 30;
    lng = lng || parseFloat(parts[1], 10) || 0;
    zoom = zoom || parseFloat(parts[2], 10) || 2;
    
    map_type = parts[3] || google.maps.MapTypeId.ROADMAP;
    
    address = $("#photoGeolocation-storylink").html() || 
      get_cookie("address") || 
      "Enter place name or address.";
  }
  
  function init_map(){
    
    get_initial_position();
    
    map = new google.maps.Map($container.find(".map")[0], {
      zoom: zoom,
      center: new google.maps.LatLng(lat, lng),
      mapTypeId: map_type,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
      }
    });
    
    geocoder = new google.maps.Geocoder();
  }
  
  function init_marker(){
    var icon, shadow, infowindow, message, show_info, hide_info, info_hidden;
      
    icon = new google.maps.MarkerImage(MARKER_SRC,
      new google.maps.Size(21, 29),
      new google.maps.Point(0,0),
      new google.maps.Point(9, 28)
    );

    shadow = new google.maps.MarkerImage(MARKER_SRC,
      new google.maps.Size(21, 18),
      new google.maps.Point(0,29),
      new google.maps.Point(2, 17)
    );
    
    marker = new google.maps.Marker({
      map: map,
      title: "Drag me!",
      draggable: true,
      visible: !!has_location,
      icon: icon,
      position: map.getCenter(),
      shadow: shadow
    });
    
    message = "<h3>Drag me</h3>";
    
    infowindow = new google.maps.InfoWindow();
    info_hidden = true;
    
    show_info = function() {
      infowindow.setContent(message);
      infowindow.open(map, marker);
      info_hidden = false;
    };
    
    hide_info = function(){
      infowindow.close();
      info_hidden = true;
    };

    google.maps.event.addListener(marker, 'click', function(){
      if (info_hidden){
        show_info();
      } else {
        hide_info();
      }
    });
    
    google.maps.event.addListener(map, 'click', function(event) {
      if (event.latLng){
        hide_info();
        position(event.latLng);
      }
    });
  }
  
  
  function position(latLng){
    
    marker.setPosition(latLng);
    
    if (!marker.getVisible()){
      marker.setVisible(true);
    }
    
    var info = [
      latLng.toUrlValue(),
      map.getZoom(),
      map.getMapTypeId()
    ];
    
    set_cookie("location", info.join(","));
  }
  
  function find(address){
    var options = {
      address: address,
      bounds: map.getBounds()
    };
    
    geocoder.geocode(options, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        var geometry = results[0].geometry;
        map.fitBounds(geometry.viewport);
        position(geometry.location);
      } else {
        alert("Could not find location.");
        $input.select();
      }
    });
  }
  
  function set_cookie(name, value){
    var one_year = 365*60*60*24*200,
      expire = new Date((new Date().getTime()) + one_year);
    
    document.cookie = "ubilabs_" +  
      name + "=" + 
      escape(value) + "; expires=" + 
      expire.toGMTString() + "; path=/";
  }
  
  function get_cookie(name){
    var regex, match;
    
    regex = new RegExp("ubilabs_" + name + "[^\=]*=([^\;]*)");
    match = document.cookie.match(regex);
    
    return match && unescape(match[1]);
  }

  function show(){
    $background.show();
    $container.show();
  }
  
  function hide(){
    $background.hide();
    $container.hide();
  }
  
  window.geocoding_bookmarklet = {
    initialize: initialize,
    reload: reload
  };
  
  initialize();

})(window);


