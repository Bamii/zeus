use clap;

#[derive(Debug)]
pub struct PackageMeta {
    pub name: String,
    pub version: String,
}

#[derive(Debug)]
pub struct PackageManager {
    pub install: fn(arr: &Vec<String>) -> Option<(String, Vec<String>)>,
    pub uninstall: fn(arr: &Vec<String>) -> Option<(String, Vec<String>)>,

    pub get_package_and_version: fn(package: &str) -> PackageMeta,
    pub build_package_version: fn(package: &str, version: &str) -> String,
    pub parse_command: fn(matches: &Vec<String>) -> Vec<String>,

    pub install_command: fn() -> clap::Command,
    pub uninstall_command: fn() -> clap::Command,

    pub name: String,
    pub packages: Vec<String>,
}

pub trait Parse {
    fn parse(&self, arr: &Vec<String>) -> Option<(String, String, Vec<String>)>;
    fn has_package(&self, package: &str) -> bool;
    fn parse_package_name(&self, package_name: &str);
}

impl Parse for PackageManager {
    fn has_package(&self, package: &str) -> bool {
        self.packages
            .iter()
            .find(|&a| a.as_str() == package)
            .is_some()
    }

    // parse the command sent to the program to see if its a valid command.
    fn parse(&self, arr: &Vec<String>) -> Option<(String, String, Vec<String>)> {
        [self.uninstall_command, self.install_command]
            .iter()
            .find_map(|a: &fn() -> clap::Command| {
                let res = a().try_get_matches_from(&arr[0..]);

                match res {
                    Ok(r) => {
                        let idxx = r.ids().next();

                        match idxx {
                            Some(val) => {
                                let value = val.as_str();
                                let vals = r
                                    .get_many::<String>(value)
                                    .unwrap()
                                    .into_iter()
                                    .map(String::from)
                                    .collect::<Vec<String>>();

                                Some((self.name.to_string(), value.to_string(), vals))
                            }
                            None => {
                                let (_, arg_matches) = r.subcommand().unwrap();

                                let id = arg_matches.ids().next().unwrap().to_string();
                                let vals = arg_matches
                                    .get_many::<String>(&id)
                                    .unwrap()
                                    .into_iter()
                                    .map(String::from)
                                    .collect::<Vec<String>>();

                                Some((self.name.to_string(), id, vals))
                            }
                        }
                    }
                    Err(_) => None,
                }
            })
    }

    fn parse_package_name(&self, package_name: &str) {
        let split_package_name = package_name.split("@").collect::<Vec<&str>>();

        println!("{:?}", split_package_name);
    }
}
