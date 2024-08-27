#!/bin/sh

file=$1; fltfile=$2; lat=$3; lon=$4; xlim=$5; zlim=$6; magthr=$7; magmin=$8;


#--- CONVERT AND WRITE DDRT EVENTS IN 3D BOX TO TMP FILE:
awk '
        BEGIN {
                RAD = 0.0174532925199432957;
                lat0 = '$lat';
                lon0 = '$lon';
                xlim = '$xlim';
                zlim = '$zlim';
                magmin = '$magmin';
                ns = 111.198;
                ew = ns*cos(RAD*lat0);
        }
        {
                # Q&D SDC: 
                y = ns*($2 - lat0);
                x = ew*($3 - lon0);
		if($17>magmin && x>-xlim && x<xlim && y>-xlim && y<xlim && $4<zlim) printf("%d %d %d %d %d %d %d %f %f %f %f\n", $1,$11,$12,$13,$14,$15,$16,x,y,-$4,$17);
        } ' $file > tmp

#--- WRITE .jvx FILE:
echo '<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>'
echo '<!DOCTYPE jvx-model SYSTEM "http://www.javaview.de/rsrc/jvx.dtd">'
echo '<jvx-model>'
echo '  <version>VERSION</version>'
echo '  <title>Real-Time DD Earthquakes Near nc71381061</title>'
echo '  <geometries>'

echo '    <geometry name="DDRT eqs - last week">'
echo '      <pointSet dim="0" point="show">'
echo '        <points num="X">'

awk '
        BEGIN {
                magthr = '$magthr';
        }
	{if($11 < magthr) printf("%s %3.1f %s %d %s %f %f %f %s\n", "<p  name=\42M=",$11,"ID=",$1,"\42>", $8, $9, $10,"</p>") } ' tmp

echo '          <thickness>1</thickness>'
echo '          <color type="rgba">0.10 0.10 0.10 0.00</color>'
echo '          <colorTag type="rgba">0.10 0.10 0.10 0.00</colorTag>'
echo '        </points>'
echo '      </pointSet>'
echo '    </geometry>'

echo '    <geometry name="DDRT eqs - last week">'
echo '      <pointSet dim="0" point="show">'
echo '        <points num="X">'

awk '
        BEGIN {
                magthr = '$magthr';
        }
	{if($11 >= magthr) printf("%s %3.1f %s %d %s %f %f %f %s\n", "<p  name=\42M=",$11,"ID=",$1,"\42>", $8, $9, $10,"</p>") } ' tmp

echo '          <thickness>3</thickness>'
echo '          <color type="rgba">1.00 0.00 0.00 0.00</color>'
echo '          <colorTag type="rgba">1.00 0.00 0.00 0.00</colorTag>'
echo '        </points>'
echo '      </pointSet>'
echo '    </geometry>'

rm -f tmp


#--- WRITE FAULT TRACES IN 3D BOX:
if ( test -f $fltfile ); then
echo "NaN NaN" >tmp.flts
awk '
        BEGIN {
                RAD = 0.0174532925199432957;
                lat0 = '$lat';
                lon0 = '$lon';
                xlim = '$xlim';
                ns = 111.198;
                ew = ns*cos(RAD*lat0);
		npts= 1;
        }
	{
		if($1=="NaN" && npts>0) {print "NaN NaN"; npts=0;}
		if($1!="NaN") {
			lon = $2; lat = $1; 
                	y = ns*(lat - lat0);
	        	x = ew*(lon - lon0);
			if(x>-xlim && x<xlim && y>-xlim && y<xlim) {printf("%f %f\n", x, y); npts=npts+1};
		}
	} ' $fltfile >> tmp.flts 
echo "NaN NaN" >> tmp.flts;
nl=`/usr/bin/wc -l < ./tmp.flts | bc`;

#--- Write to .jvx file:
awk '
        BEGIN {
		nl = '$nl';
               	istart = 1; 
	}
	{
		il++;
		if($1=="NaN") inew = 1; else inew = 0;
		if(inew==1) {

			if(istart==0) {
				print "          <thickness>2</thickness>"
				print "          <color type=\"rgba\">0.00 0.00 0.00 0.00</color>"
				print "        </points>"
				print "      </pointSet>"
				print "      <lineSet line=\"show\">"
				print "        <lines num=\"1\">"
	
				for (i = 0; i < npts-1; i++)
					print "<l>" i " " i+1  "</l>"
	
				print "          <thickness>1</thickness>"
				print "          <color type=\"rgba\">0.00 0.00 0.00 0.00</color>"
				print "          <colorTag type=\"rgba\">0.00 0.00 0.00 0.00</colorTag>"
				print "        </lines>"
				print "        <colors type=\"rgba\" num=\"2\">"

				for (i = 0; i <= npts-2; i++)
					print "<c>0.00 0.00 0.00 0.00</c>";
				print "        </colors>"
				print "      </lineSet>"
				print "    </geometry>"

				inew = 0;
				npts = 0;
 			};
			istart = 0;
			if(il<nl) {
				print "    <geometry name= \" \">"
				print "      <pointSet dim=\"0\" point=\"hide\">"
				print "        <points num=\"X\">"
			};
		};

		if(inew==0 && $1 != "NaN") {
			printf("%s %f %f %s\n", "<p> ",$1, $2," 0.0 </p>"); npts=npts+1};

        } ' tmp.flts 

rm -f tmp.flts

fi	# ifaults = 1


#-- ADD 3D BOX:
cat 3d.jvx.base1
