#!/bin/bash
# eqview3D.sh  -  Felix Waldhauser, felixw@ldeo.columbia.edu

# Change Log: 
# 160425:  replaced Bill's javaview with Eric's javascript 
# 130812:  added fault lines 
# 130807:  added magthr parameter 
# 130408:  fixed xlim/zlim bug
# Started march 2013, based on applets by Bill Ellsworth and Bob 
# Simpson (USGS) and my own scripts from DDRT software package.

#--- PARAMETERS:
id="CF";                             # Project name

eqfile="CF.cat";  # earthquake file in hypoDD format
#Here for CF, "faults.dat" is empty, commenting the line below might lead to an error
fltfile="faults.dat";	  # fault file

#--- Define center of box:
lat0=40.82; lon0=14.12;

#--- Set dimension (side length and depth) and view of 3D box:
#    Note: Scale box by setting the camera position.
xlim=15; zlim=6; cameraposition=8;

#--- Show all events with M > magmin and those with M > magthr in red: 
magmin=-2.5;
magthr=2.7;

#----------------------------------------------------
echo 'starting eqview3D (April 2016)'

#--- WRITE .jvd FILE::
datetime="`date -u`";
cp 3d.jvd $id.jvd
sed -i '' "s/CAMERAPOSITION/$cameraposition/g" $id.jvd

#--- WRITE .jvx FILE::
xxlim=`expr $xlim / 2`; zzlim=`expr $zlim`;
./3d_jvx.sh $eqfile $fltfile $lat0 $lon0 $xxlim $zzlim $magthr $magmin > $id.jvx
sed -i '' "s/XLIM/$xxlim/g" $id.jvx 
sed -i '' "s/ZLIM/$zzlim/g" $id.jvx 

#--- WRITE *.html FILE: 
cp 3d.html $id.3d.html 
sed -i '' "s/-EVENTID-/$id/g" $id.3d.html 
sed -i '' "s/-PROJECTNAME-/$id/g" $id.3d.html 
sed -i '' "s/-XLIM-/$xlim/g" $id.3d.html 
sed -i '' "s/-ZLIM-/$zlim/g" $id.3d.html 
sed -i '' "s/-MAGTHR-/$magthr/g" $id.3d.html 
sed -i '' "s/-DATETIME-/$datetime/g" $id.3d.html 
