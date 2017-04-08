(function(){
    angular.module('cabApp').controller('indexCtrl', function($scope, $state, $http){

        $scope.uberGo = {};
        $scope.uberGo.duration = 0;
        $scope.email = "";
        $scope.actualTime = Date.now();
        $scope.cabArrivalTime = 0;

        //UBER API credentials. Have used my personal server token since the one provided in problem statement will not work unless Origin URI is specified in Uber API Dashboard
        var uberServerToken = "CwSavRMVoN2IUGvfJwN5hKvC9BWhdAGedCk1KoeD";

        //Initial values to draw on map
        $scope.sourceLat = 12.9716;
        $scope.sourceLng = 77.5946;
        $scope.destLat = 12.936794;
        $scope.destLng = 77.580280;

        var blore = {lat: $scope.sourceLat, lng: $scope.sourceLng};
        var dest = {lat: $scope.destLat, lng: $scope.destLng};

        //Draw map
        var map = new google.maps.Map(document.getElementById('map'), {
            center: blore,
            zoom: 12
        });

        //Source marker
        var sourceMarker = new google.maps.Marker({
            position: blore,
            map: map,
            draggable: true,
            animation: google.maps.Animation.DROP,
            title: "Source point"
        });

        //Destination marker
        var destinationMarker = new google.maps.Marker({
            position: dest,
            map: map,
            draggable: true,
            animation: google.maps.Animation.DROP,
            title: "Destination point"
        });

        //Update source marker coordinates when it is moved
        google.maps.event.addListener(sourceMarker, 'dragend', function(evt){
            $scope.sourceLat = evt.latLng.lat().toFixed(3);
            $scope.sourceLng = evt.latLng.lng().toFixed(3);
            $scope.$digest();
        });

        //Update source marker coordinates when it is moved
        google.maps.event.addListener(destinationMarker, 'dragend', function(evt){
            $scope.destLat = evt.latLng.lat().toFixed(3);
            $scope.destLng = evt.latLng.lng().toFixed(3);
            $scope.$digest();
        });

        //Get the list of cabs available for the selected source point and also the estimated time of cab arrival at source point
        $scope.checkUberAvailability = function(sourceLat, sourceLng, destLat, destLng){
            $http({
                method: "GET",
                url: "https://api.uber.com/v1.2/estimates/time?start_latitude=" + sourceLat + "&start_longitude=" + sourceLng + "&product_id=db6779d6-d8da-479f-8ac7-8068f4dade6f",  //Have used specific product ID of UberGo since problem statement mentions the same
                headers: {
                    Authorization: "Token " + uberServerToken
                }
            }).then(function(res){
                //If no UberGo is available (most likely when the source marker is set in Indian Ocean :/ )
                if(res.data.times.length == 0){
                    $scope.noCabsNotify();
                } else if(res.data.times.length == 1){  //If only one UberGo is available
                    $scope.cabArrivalTime = res.data.times[0].estimate;

                    //Get fares and travel time
                    $scope.getUberFareAndTime(sourceLat, sourceLng, destLat, destLng, $scope.cabArrivalTime);
                }else {
                    //If multiple UberGos are available, get time estimates for all the available cabs and select the shortest one
                    var durationArray = [];
                    res.data.times.forEach(function(item){
                        durationArray.push(item.estimate);
                    })
                    durationArray.sort(function(a,b){
                        return a-b;
                    });
                    $scope.cabArrivalTime = durationArray[0];

                    //Get fares and travel time
                    $scope.getUberFareAndTime(sourceLat, sourceLng, destLat, destLng, $scope.cabArrivalTime);
                }
            })
        };

        $scope.getUberFareAndTime = function(sourceLat, sourceLng, destLat, destLng, cabArrivalTime){
            $http({
                method: "GET",
                url: "https://api.uber.com/v1.2/estimates/price?start_latitude=" + sourceLat + "&start_longitude=" + sourceLng + "&end_latitude=" + destLat + "&end_longitude=" + destLng,                                
                headers: {
                    Authorization: "Token " + uberServerToken
                }
            }).then(function(response){
                response.data.prices.forEach(function(item){
                    if(item.display_name == "UberGO"){  //Only get the fares and time estimate for UberGo 
                        $scope.uberGo = item;
                        //check if time of journey (current epoch time in milliseconds + travel estimate time in milliseconds + cab arrival estimate time in milliseconds) exceeds the destination arrival time selected by user
                        $scope.actualTime = $scope.currentTime + ($scope.uberGo.duration * 1000) + (cabArrivalTime * 1000);
                        if($scope.actualTime > $scope.arrivalTime){  //Cannot reach on time
                            $scope.shortTimeNotify();
                        } else if(($scope.arrivalTime - $scope.actualTime) < 1800000){ //Will reach on time if cab is booked in 30 mins
                            $scope.remindToBookNow();
                        }else {  //Will reach on time if cab is booked before specified time
                            $scope.remindToBook(Date.now() + ($scope.arrivalTime - $scope.actualTime));
                        }
                    }
                })
            }, function(err){
                console.log(err);
            });
        }

        //Activate date time picker
        $('#datetimepicker1').datetimepicker({
            format: 'DD-MM-YYYY HH:mm',
            useCurrent: true,
            minDate:new Date()
        });

        //Capture destination arrival time when user inputs it
        $("#datetimepicker1").on("dp.change", function (e) {
            $scope.arrivalTime = Date.parse(e.date);
        });

        $scope.checkStatus = function(){
            var userTime = $('#userTime').val(); 
            if(userTime){
                $scope.currentTime = Date.now();
                $scope.checkUberAvailability($scope.sourceLat, $scope.sourceLng, $scope.destLat, $scope.destLng);
            } else { //If the user has not selected the time even once
                $.notify({
                    message: "Please select the time at which you have to reach the destination"
                },{
                    type: 'danger',
                    delay: 20000,
                    animate: {
                        enter: 'animated fadeInRight',
                        exit: 'animated fadeOutRight'
                    }
                });
            }
        }

        //Below are just some calls to the $notify library which sends a notification. Can put them all in one function and call with the 'message' parameter every time to optimize and reduce some code
        $scope.shortTimeNotify = function(){
            $.notify({
                message: "Oops! Looks like you won't reach on time! You want to reach the destination at " + moment($scope.arrivalTime).format('DD-MM-YYYY HH:mm') + " but according to Uber, your cab would reach around " + moment($scope.actualTime).format('DD-MM-YYYY HH:mm')                                                                
            },{
                type: 'danger',
                delay: 20000,
                animate: {
                    enter: 'animated fadeInRight',
                    exit: 'animated fadeOutRight'
                }
            });
        }

        $scope.noCabsNotify = function(){
            $scope.uberGo.duration = 0;
            $scope.uberGo.estimate = "";
            $.notify({
                message: "No cabs available for selected route."
            },{
                type: 'danger',
                delay: 20000,
                animate: {
                    enter: 'animated fadeInRight',
                    exit: 'animated fadeOutRight'
                }
            });
        }

        $scope.remindToBook = function(time){
            $.notify({
                message: "You will reach your destination on time if you book your cab before " + moment(time).format('DD-MM-YYYY HH:mm')
            },{
                type: 'info',
                delay: 20000,
                animate: {
                    enter: 'animated fadeInRight',
                    exit: 'animated fadeOutRight'
                }
            });
        }

        $scope.remindToBookNow = function(){
            $.notify({
                message: "Book your cab within half an hour to reach destination on time!"
            },{
                type: 'info',
                delay: 20000,
                animate: {
                    enter: 'animated fadeInRight',
                    exit: 'animated fadeOutRight'
                }
            });
        }

   });
})();